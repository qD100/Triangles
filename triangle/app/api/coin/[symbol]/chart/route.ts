import { NextResponse } from "next/server";
import { SYMBOL_TO_COINGECKO_ID } from "../route";

// Price chart data (Binance klines) is fetched client-side instead of here —
// Binance blocks requests from US-based cloud/datacenter IPs, which is where
// this route would otherwise run. CoinGecko (used below) doesn't block Vercel,
// so market cap history stays server-side.

type Range = "24h" | "1w" | "1m" | "1y" | "all";

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
  const rangeParam = searchParams.get("range");
  const range: Range =
    rangeParam === "24h" ||
    rangeParam === "1w" ||
    rangeParam === "1m" ||
    rangeParam === "1y" ||
    rangeParam === "all"
      ? rangeParam
      : "1w";

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
