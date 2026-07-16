import type { Allocation, EtfSymbol } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Portfolio-weighted average pairwise correlation, inverted to a 0-100
 * score. Uses the actual recommended weights (not a flat cross-ETF
 * average) so it reflects this specific allocation's diversification.
 */
export function diversificationScore(
  weights: Allocation,
  symbols: EtfSymbol[],
  correlationMatrix: number[][]
): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < symbols.length; i++) {
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) continue;
      const wi = weights[symbols[i]] / 100;
      const wj = weights[symbols[j]] / 100;
      num += wi * wj * correlationMatrix[i][j];
      den += wi * wj;
    }
  }
  if (den < 1e-9) return 0;
  const weightedAvgCorrelation = num / den;
  return clamp(100 * (1 - weightedAvgCorrelation), 0, 100);
}
