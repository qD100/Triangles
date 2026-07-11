import { NextResponse } from "next/server";
import { initialCoins } from "@/app/data/initialCoins";

export async function GET() {
  const symbols = initialCoins.map((coin) => coin.symbol).join(",");
  const apiKey = process.env.CMC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({});
  }

  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}&convert=USD`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          Accept: "application/json",
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      return NextResponse.json({});
    }

    const json = await response.json();
    const quotes: Record<
      string,
      { market_cap: number; price: number; percent_change_24h: number }
    > = {};

    for (const symbol of Object.keys(json.data ?? {})) {
      const entry = json.data[symbol];
      const quote = Array.isArray(entry) ? entry[0] : entry;
      const usd = quote?.quote?.USD;

      if (typeof usd?.market_cap === "number") {
        quotes[symbol] = {
          market_cap: usd.market_cap,
          price: usd.price ?? 0,
          percent_change_24h: usd.percent_change_24h ?? 0,
        };
      }
    }

    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json({});
  }
}
