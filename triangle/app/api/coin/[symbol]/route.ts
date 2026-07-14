import { NextResponse } from "next/server";

export const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  TRX: "tron",
  HYPE: "hyperliquid",
  ZEC: "zcash",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const geckoId = SYMBOL_TO_COINGECKO_ID[upperSymbol];

  if (!geckoId) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  }

  const [tickerResult, geckoResult] = await Promise.allSettled([
    fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${upperSymbol}USDT`,
      { next: { revalidate: 15 } }
    ),
    fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      { next: { revalidate: 30 } }
    ),
  ]);

  let price: number | null = null;
  let percentChange24h: number | null = null;
  let volume24h: number | null = null;

  if (tickerResult.status === "fulfilled" && tickerResult.value.ok) {
    const ticker = await tickerResult.value.json();
    price = Number(ticker.lastPrice);
    percentChange24h = Number(ticker.priceChangePercent);
    volume24h = Number(ticker.quoteVolume);
  }

  let percentChange30d: number | null = null;
  let percentChange1y: number | null = null;
  let marketCap: number | null = null;
  let name: string | null = null;

  if (geckoResult.status === "fulfilled" && geckoResult.value.ok) {
    const gecko = await geckoResult.value.json();
    const marketData = gecko.market_data ?? {};

    name = gecko.name ?? null;
    percentChange30d = marketData.price_change_percentage_30d ?? null;
    percentChange1y = marketData.price_change_percentage_1y ?? null;
    marketCap = marketData.market_cap?.usd ?? null;

    if (price === null) {
      price = marketData.current_price?.usd ?? null;
    }

    if (percentChange24h === null) {
      percentChange24h = marketData.price_change_percentage_24h ?? null;
    }

    if (volume24h === null) {
      volume24h = marketData.total_volume?.usd ?? null;
    }
  }

  return NextResponse.json({
    symbol: upperSymbol,
    name,
    price,
    percentChange24h,
    percentChange30d,
    percentChange1y,
    volume24h,
    marketCap,
  });
}
