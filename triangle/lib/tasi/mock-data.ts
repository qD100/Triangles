import { getChart, type ChartBar } from "./yahoo";

export interface PriceSeries {
  symbol: string;
  price: number;
  bars: ChartBar[];
  isSimulated: boolean;
}

export interface PriceDataProvider {
  getSeries(symbol: string, range?: string): Promise<PriceSeries | null>;
}

// The real provider — everything in both scanners runs on this today.
export const yahooProvider: PriceDataProvider = {
  async getSeries(symbol, range = "2y") {
    const chart = await getChart(symbol, range);
    if (!chart.bars.length) return null;
    return { symbol, price: chart.price, bars: chart.bars, isSimulated: false };
  },
};

// Deterministic seeded random walk — used ONLY when the real provider fails
// for a given symbol, so the UI can render a complete row instead of a gap.
// Seeded by symbol so a refresh doesn't jump the series around; always
// tagged isSimulated so the UI can badge it clearly. This is the one-file
// swap point: replacing `yahooProvider` above (or the fallback here) with a
// real NAV/broker feed later touches nothing downstream.
function hashSeed(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export const mockProvider: PriceDataProvider = {
  async getSeries(symbol) {
    const rand = seededRandom(hashSeed(symbol));
    const days = 500;
    const bars: ChartBar[] = [];
    let price = 50 + rand() * 50;
    const today = new Date();
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      price *= 1 + (rand() - 0.5) * 0.02;
      bars.push({ date: date.toISOString().slice(0, 10), close: price });
    }
    return { symbol, price, bars, isSimulated: true };
  },
};

// Tries the real provider first; falls back to the deterministic mock only
// on failure, tagging the result so downstream UI never confuses the two.
export async function getSeriesWithFallback(
  symbol: string,
  range?: string,
): Promise<PriceSeries> {
  try {
    const real = await yahooProvider.getSeries(symbol, range);
    if (real) return real;
  } catch {
    // fall through to mock
  }
  return mockProvider.getSeries(symbol) as Promise<PriceSeries>;
}
