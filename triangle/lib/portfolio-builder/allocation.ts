import { ALLOCATION_ANCHORS, ETF_SYMBOLS, VOL_TILT_WEIGHT } from "./constants";
import type { Allocation, AllocationResult, EtfSymbol } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Piecewise-linear interpolation across the spec's own three example portfolios. */
export function interpolateAllocation(score: number): Allocation {
  const s = clamp(score, 0, 100);
  const [lo, hi, t] =
    s <= 50
      ? [ALLOCATION_ANCHORS[0], ALLOCATION_ANCHORS[50], s / 50]
      : [ALLOCATION_ANCHORS[50], ALLOCATION_ANCHORS[100], (s - 50) / 50];

  const result = {} as Allocation;
  for (const symbol of ETF_SYMBOLS) {
    result[symbol] = lo[symbol] + (hi[symbol] - lo[symbol]) * t;
  }
  return result;
}

/** Risk-parity-style tilt: lower historical volatility -> higher weight. */
export function inverseVolWeights(volBySymbol: Record<EtfSymbol, number>): Allocation {
  const inverses = ETF_SYMBOLS.map((symbol) => 1 / volBySymbol[symbol]);
  const total = inverses.reduce((sum, value) => sum + value, 0);

  const result = {} as Allocation;
  ETF_SYMBOLS.forEach((symbol, i) => {
    result[symbol] = (inverses[i] / total) * 100;
  });
  return result;
}

/**
 * Blends the risk-score-interpolated baseline with an inverse-volatility
 * tilt so the final allocation responds to BOTH the questionnaire and
 * historical volatility, while staying smooth/continuous as score moves.
 * Renormalization is a float-precision safety net, not load-bearing logic:
 * both inputs already sum to 100 and are non-negative by construction.
 */
export function buildAllocation(
  score: number,
  volBySymbol: Record<EtfSymbol, number>,
  tiltWeight: number = VOL_TILT_WEIGHT
): AllocationResult {
  const baseline = interpolateAllocation(score);
  const invVol = inverseVolWeights(volBySymbol);

  const blended = {} as Allocation;
  for (const symbol of ETF_SYMBOLS) {
    blended[symbol] = (1 - tiltWeight) * baseline[symbol] + tiltWeight * invVol[symbol];
  }

  const total = ETF_SYMBOLS.reduce((sum, s) => sum + Math.max(blended[s], 0), 0);
  const final = {} as Allocation;
  for (const symbol of ETF_SYMBOLS) {
    final[symbol] = total > 0 ? (Math.max(blended[symbol], 0) / total) * 100 : 0;
  }

  return { baseline, final };
}
