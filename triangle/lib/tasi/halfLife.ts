import { olsRegression } from "./regression";

// Ornstein-Uhlenbeck half-life: regress delta-spread on lagged spread,
// spread_t - spread_{t-1} = kappa * spread_{t-1} + c + e_t.
// A negative kappa implies mean reversion; half-life = -ln(2) / kappa.
// Returns null when the series isn't mean-reverting (kappa >= 0) or there's
// not enough data.
export function estimateHalfLife(spread: number[]): number | null {
  if (spread.length < 10) return null;

  const laggedSpread = spread.slice(0, -1);
  const deltaSpread = spread.slice(1).map((v, i) => v - laggedSpread[i]);

  const { beta: kappa } = olsRegression(deltaSpread, laggedSpread);
  if (kappa >= 0) return null;

  const halfLife = -Math.log(2) / kappa;
  return Number.isFinite(halfLife) && halfLife > 0 ? halfLife : null;
}
