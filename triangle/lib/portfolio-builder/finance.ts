import type { EtfSymbol, RiskTier } from "./types";
import { DAYS_PER_YEAR, TRADING_DAYS_PER_YEAR } from "./constants";

export function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Sample standard deviation (n-1 denominator). */
export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** CAGR annualized over the actual calendar-day span (a calendar-time concept). */
export function annualizedReturn(prices: number[], dates: string[]): number {
  const first = new Date(dates[0]).getTime();
  const last = new Date(dates[dates.length - 1]).getTime();
  const years = (last - first) / (86_400_000 * DAYS_PER_YEAR);
  if (years <= 0) return 0;
  return Math.pow(prices[prices.length - 1] / prices[0], 1 / years) - 1;
}

/** Annualized volatility uses the trading-day convention (frequency-based, not calendar-based). */
export function annualizedVolatility(dailyVol: number): number {
  return dailyVol * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/** Generic max drawdown over any cumulative-value series (prices or portfolio growth). */
export function maxDrawdown(series: number[]): number {
  let peak = series[0];
  let worst = 0;
  for (const value of series) {
    peak = Math.max(peak, value);
    worst = Math.min(worst, value / peak - 1);
  }
  return worst;
}

/**
 * Deliberately reuses the same CAGR/annualized-vol shown on the card rather
 * than the academic arithmetic-mean-return variant, so the numbers on one
 * card stay internally consistent.
 */
export function sharpeRatio(
  annReturn: number,
  annVol: number,
  riskFreeRate: number
): number {
  if (annVol === 0) return 0;
  return (annReturn - riskFreeRate) / annVol;
}

function correlation(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? 0 : num / denom;
}

function covariance(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - ma) * (b[i] - mb);
  return sum / (a.length - 1);
}

export function correlationMatrix(
  returnsBySymbol: Record<EtfSymbol, number[]>,
  symbols: EtfSymbol[]
): number[][] {
  return symbols.map((a) =>
    symbols.map((b) => correlation(returnsBySymbol[a], returnsBySymbol[b]))
  );
}

/** Annualized (daily covariance * 252 trading days). */
export function covarianceMatrix(
  returnsBySymbol: Record<EtfSymbol, number[]>,
  symbols: EtfSymbol[]
): number[][] {
  return symbols.map((a) =>
    symbols.map(
      (b) => covariance(returnsBySymbol[a], returnsBySymbol[b]) * TRADING_DAYS_PER_YEAR
    )
  );
}

/** Assumes daily-rebalanced fixed weights — internally consistent with the covariance-based diversification/volatility math elsewhere. */
export function portfolioDailyReturns(
  weights: Record<EtfSymbol, number>,
  returnsBySymbol: Record<EtfSymbol, number[]>,
  symbols: EtfSymbol[]
): number[] {
  const length = returnsBySymbol[symbols[0]].length;
  const result = new Array(length).fill(0);
  for (const symbol of symbols) {
    const w = weights[symbol] / 100;
    const returns = returnsBySymbol[symbol];
    for (let i = 0; i < length; i++) result[i] += w * returns[i];
  }
  return result;
}

/** sqrt(w^T * Sigma * w) using the annualized covariance matrix. */
export function portfolioVolatility(
  weights: Record<EtfSymbol, number>,
  covMatrix: number[][],
  symbols: EtfSymbol[]
): number {
  let variance = 0;
  for (let i = 0; i < symbols.length; i++) {
    for (let j = 0; j < symbols.length; j++) {
      variance +=
        (weights[symbols[i]] / 100) * (weights[symbols[j]] / 100) * covMatrix[i][j];
    }
  }
  return Math.sqrt(Math.max(variance, 0));
}

export function growthOfInvestment(returns: number[], start = 10_000): number[] {
  const series = [start];
  for (const r of returns) series.push(series[series.length - 1] * (1 + r));
  return series;
}

export function rollingVolatility(
  returns: number[],
  window: number
): Array<number | null> {
  return returns.map((_, i) => {
    if (i < window - 1) return null;
    const slice = returns.slice(i - window + 1, i + 1);
    return annualizedVolatility(stdev(slice));
  });
}

/** Rank the 5 ETFs by annualized volatility: lowest -> good, highest -> critical. */
export function assignRiskTiers(
  volBySymbol: Record<EtfSymbol, number>,
  symbols: EtfSymbol[]
): Record<EtfSymbol, { rank: number; tier: RiskTier }> {
  const sorted = [...symbols].sort((a, b) => volBySymbol[a] - volBySymbol[b]);
  const result = {} as Record<EtfSymbol, { rank: number; tier: RiskTier }>;
  sorted.forEach((symbol, index) => {
    const rank = index + 1;
    const tier: RiskTier =
      rank === 1 ? "good" : rank === sorted.length ? "critical" : "warning";
    result[symbol] = { rank, tier };
  });
  return result;
}
