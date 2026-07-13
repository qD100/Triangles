import { NextResponse } from "next/server";
import { SYMBOL_TO_COINGECKO_ID } from "../route";

type Range = "24h" | "1w" | "1m" | "1y" | "all";

const KLINE_PARAMS: Record<Range, { interval: string; limit: number }> = {
  "24h": { interval: "5m", limit: 288 },
  "1w": { interval: "1h", limit: 168 },
  "1m": { interval: "4h", limit: 180 },
  "1y": { interval: "1d", limit: 365 },
  all: { interval: "1w", limit: 500 },
};

const GECKO_DAYS: Record<Range, string> = {
  "24h": "1",
  "1w": "7",
  "1m": "30",
  "1y": "365",
  all: "max",
};

const MAX_POINTS = 500;

function downsample<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;

  const step = points.length / maxPoints;
  const result: T[] = [];

  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.floor(i * step)]);
  }

  return result;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const geckoId = SYMBOL_TO_COINGECKO_ID[upperSymbol];

  if (!geckoId) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "marketcap" ? "marketcap" : "price";
  const rangeParam = searchParams.get("range");
  const range: Range =
    rangeParam === "24h" ||
    rangeParam === "1w" ||
    rangeParam === "1m" ||
    rangeParam === "1y" ||
    rangeParam === "all"
      ? rangeParam
      : "1w";

  if (type === "price") {
    const { interval, limit } = KLINE_PARAMS[range];

    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${upperSymbol}USDT&interval=${interval}&limit=${limit}`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      return NextResponse.json({ points: [] });
    }

    const klines: unknown[] = await response.json();

    const points = klines.map((candle) => {
      const row = candle as [number, string, string, string, string];

      return { time: Math.floor(row[0] / 1000), value: Number(row[4]) };
    });

    return NextResponse.json({ points });
  }

  const days = GECKO_DAYS[range];

  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`,
    { next: { revalidate: 60 } }
  );

  if (!response.ok) {
    return NextResponse.json({ points: [] });
  }

  const data = await response.json();
  const marketCaps: [number, number][] = data.market_caps ?? [];

  const points = downsample(marketCaps, MAX_POINTS).map(([timestamp, value]) => ({
    time: Math.floor(timestamp / 1000),
    value,
  }));

  return NextResponse.json({ points });
}
