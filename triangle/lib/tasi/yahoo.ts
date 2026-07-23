const CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const QUOTE_SUMMARY_BASE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary";
const CRUMB_URL = "https://query1.finance.yahoo.com/v1/test/getcrumb";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Yahoo's chart endpoint is undocumented (the same one the `yfinance` Python
// library scrapes) but has been stable for years and needs no API key.
// Yahoo itself delays Saudi Exchange quotes by ~15 min, so there's no value
// in refetching faster than that.
const CHART_REVALIDATE_SECONDS = Number(
  process.env.YAHOO_CHART_REVALIDATE_SECONDS ?? 900, // 15 min
);
const MARKET_CAP_REVALIDATE_SECONDS = Number(
  process.env.YAHOO_MARKET_CAP_REVALIDATE_SECONDS ?? 21600, // 6h
);

export class YahooApiError extends Error {
  constructor(
    public path: string,
    public status: number,
  ) {
    super(`Yahoo Finance request to ${path} failed with status ${status}`);
    this.name = "YahooApiError";
  }
}

export interface ChartBar {
  date: string; // YYYY-MM-DD
  close: number;
}

export interface ChartResult {
  price: number;
  volume: number | null;
  bars: ChartBar[]; // ascending by date, includes today's still-forming bar
}

export async function getChart(symbol: string, range = "1y"): Promise<ChartResult> {
  const path = `/${symbol}?range=${range}&interval=1d`;
  const res = await fetch(`${CHART_BASE}${path}`, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: CHART_REVALIDATE_SECONDS },
  });

  if (!res.ok) throw new YahooApiError(path, res.status);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new YahooApiError(path, 502);

  const meta = result.meta ?? {};
  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  const bars: ChartBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null) continue;
    bars.push({
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      close,
    });
  }

  return {
    price: meta.regularMarketPrice,
    volume: meta.regularMarketVolume ?? null,
    bars,
  };
}

// quoteSummary needs a session cookie + crumb — an undocumented, fragile
// mechanism. The crumb endpoint itself 401s ("Invalid Cookie") without a
// prior cookie from fc.yahoo.com (which 404s but still sets one via
// Set-Cookie — that 404 is expected and not a failure). Cached in memory;
// callers must treat failures as soft and fall back to a static reference
// value rather than erroring the page.
let session: { cookie: string; crumb: string; fetchedAt: number } | null = null;
const SESSION_TTL_MS = 30 * 60 * 1000;

async function getSession(): Promise<{ cookie: string; crumb: string }> {
  if (session && Date.now() - session.fetchedAt < SESSION_TTL_MS) {
    return session;
  }

  const consentRes = await fetch("https://fc.yahoo.com/", {
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
    cache: "no-store",
  });
  const cookie = (consentRes.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  if (!cookie) throw new YahooApiError("/fc.yahoo.com", consentRes.status);

  const crumbRes = await fetch(CRUMB_URL, {
    headers: { "User-Agent": USER_AGENT, Cookie: cookie },
    cache: "no-store",
  });
  if (!crumbRes.ok) throw new YahooApiError("/v1/test/getcrumb", crumbRes.status);

  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes("<") || crumb.includes("error")) {
    throw new YahooApiError("/v1/test/getcrumb", 502);
  }

  session = { cookie, crumb, fetchedAt: Date.now() };
  return session;
}

// Returns null (rather than throwing) on any failure — market cap here is a
// nice-to-have live enhancement, not something the page should break over.
export async function getLiveMarketCap(symbol: string): Promise<number | null> {
  try {
    const { cookie, crumb } = await getSession();
    const path = `/${symbol}?modules=price&crumb=${crumb}`;
    const res = await fetch(`${QUOTE_SUMMARY_BASE}${path}`, {
      headers: { "User-Agent": USER_AGENT, Cookie: cookie },
      next: { revalidate: MARKET_CAP_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const marketCap = json?.quoteSummary?.result?.[0]?.price?.marketCap?.raw;
    return typeof marketCap === "number" ? marketCap : null;
  } catch {
    return null;
  }
}
