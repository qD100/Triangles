import type { PricePoint } from "./types";

/**
 * Parses a yfinance `df.to_csv()` export (auto_adjust=False), which has a
 * 3-row header artifact from its MultiIndex columns:
 *   Price,Adj Close,Close,High,Low,Open,Volume
 *   Ticker,SPY,SPY,SPY,SPY,SPY,SPY
 *   Date,,,,,,
 *   2020-01-02,296.125...,324.869...,324.890...,322.529...,323.540...,59151200
 *
 * Adj Close (not Close) is used as the price series throughout the app so
 * every downstream return/volatility/drawdown/correlation calculation is a
 * total-return figure that already includes reinvested dividends.
 */
export function parseEtfCsv(raw: string): PricePoint[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const dataLines = lines.slice(3);

  const points: PricePoint[] = [];
  for (const line of dataLines) {
    const [date, adjClose] = line.split(",");
    const price = Number(adjClose);
    if (!date || Number.isNaN(price)) continue;
    points.push({ date, price });
  }

  return points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
