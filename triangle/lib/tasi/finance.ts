import type { ChartBar } from "./yahoo";

export function pctChange(current: number, past: number | undefined | null): number | null {
  if (past === undefined || past === null || past === 0) return null;
  return ((current - past) / past) * 100;
}

export function daysAgo(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

export function closestBarOnOrBefore(
  bars: ChartBar[],
  target: Date,
): ChartBar | undefined {
  let result: ChartBar | undefined;
  for (const bar of bars) {
    if (new Date(bar.date) <= target) {
      result = bar;
    } else {
      break;
    }
  }
  return result;
}

export interface AlignedPoint {
  date: string;
  a: number;
  b: number;
}

// Inner-join two bar series on date string. Different tickers can trade on
// different calendars (different exchanges/holidays/weekends), so this is
// the shared alignment step before any pairwise calculation (ETF vs
// benchmark, stock vs stock).
export function alignByDate(a: ChartBar[], b: ChartBar[]): AlignedPoint[] {
  const bByDate = new Map(b.map((bar) => [bar.date, bar.close]));
  const aligned: AlignedPoint[] = [];
  for (const bar of a) {
    const bClose = bByDate.get(bar.date);
    if (bClose !== undefined) {
      aligned.push({ date: bar.date, a: bar.close, b: bClose });
    }
  }
  return aligned;
}

// Rebase both series to 100 at the first aligned point, so different
// currencies/scales become directly comparable on one axis.
export function indexTo100(aligned: AlignedPoint[]): { date: string; aIndexed: number; bIndexed: number }[] {
  if (aligned.length === 0) return [];
  const baseA = aligned[0].a;
  const baseB = aligned[0].b;
  return aligned.map((p) => ({
    date: p.date,
    aIndexed: (p.a / baseA) * 100,
    bIndexed: (p.b / baseB) * 100,
  }));
}
