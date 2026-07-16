import type { EtfSymbol, PricePoint } from "./types";

export interface AlignedSeries {
  dates: string[];
  pricesBySymbol: Record<EtfSymbol, number[]>;
  returnsBySymbol: Record<EtfSymbol, number[]>;
}

interface DateRange {
  start: string;
  end: string;
}

/**
 * The source CSVs do not share an identical trading-day calendar (verified:
 * unique date counts differ per symbol). Correlation/covariance/portfolio
 * math is only valid on a common date set, so this inner-joins the dates
 * present in every symbol's series before deriving daily returns.
 */
export function alignPriceSeries(
  seriesBySymbol: Record<EtfSymbol, PricePoint[]>,
  symbols: EtfSymbol[],
  range?: DateRange
): AlignedSeries {
  const dateSets = symbols.map((symbol) => {
    const dates = seriesBySymbol[symbol]
      .map((point) => point.date)
      .filter((date) => !range || (date >= range.start && date <= range.end));
    return new Set(dates);
  });

  const commonDates = [...dateSets[0]]
    .filter((date) => dateSets.every((set) => set.has(date)))
    .sort();

  const pricesBySymbol = {} as Record<EtfSymbol, number[]>;
  const returnsBySymbol = {} as Record<EtfSymbol, number[]>;

  for (const symbol of symbols) {
    const priceByDate = new Map(
      seriesBySymbol[symbol].map((point) => [point.date, point.price])
    );
    const prices = commonDates.map((date) => priceByDate.get(date)!);
    pricesBySymbol[symbol] = prices;
    returnsBySymbol[symbol] = prices.slice(1).map((price, i) => price / prices[i] - 1);
  }

  return { dates: commonDates, pricesBySymbol, returnsBySymbol };
}
