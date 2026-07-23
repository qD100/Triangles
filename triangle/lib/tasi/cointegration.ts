import { olsRegression } from "./regression";

export interface CointegrationResult {
  hedgeRatio: number; // beta from the Engle-Granger step-1 regression
  intercept: number; // alpha from the same regression — needed to project a
  // price-level fair value, since the residuals themselves always average to
  // exactly 0 by construction (an OLS property, not a finding)
  spread: number[]; // step-1 residuals (the stationarity-tested series)
  adfStatistic: number;
  pValueApprox: number;
  isCointegrated: boolean; // pValueApprox <= 0.10, the conventional cutoff
}

// Augmented Dickey-Fuller regression: dy_t = c + phi*y_{t-1} + theta*dy_{t-1} + e_t
// (one lagged-difference term — a minimal "augmented" DF, not a lag-order search).
// Returns the t-statistic on phi.
function adfTStatistic(series: number[]): number {
  const y = series;
  const dy: number[] = [];
  for (let i = 1; i < y.length; i++) dy.push(y[i] - y[i - 1]);

  // Regress dy[t] on [y[t-1], dy[t-1]] — build via two sequential simple OLS
  // passes is not valid for multi-regressor OLS, so do it directly here.
  const n = dy.length - 1; // we lose one more observation to the lagged difference
  if (n < 10) return 0;

  const yLag = y.slice(1, 1 + n); // y_{t-1} aligned with dy[1..n]
  const dyLag = dy.slice(0, n); // dy_{t-1}
  const dyDep = dy.slice(1, 1 + n); // dy_t (dependent variable)

  // Multiple regression with 2 regressors + intercept via normal equations.
  const meanY = yLag.reduce((s, v) => s + v, 0) / n;
  const meanDL = dyLag.reduce((s, v) => s + v, 0) / n;
  const meanDep = dyDep.reduce((s, v) => s + v, 0) / n;

  let sYY = 0;
  let sYD = 0;
  let sDD = 0;
  let sYdep = 0;
  let sDdep = 0;
  for (let i = 0; i < n; i++) {
    const y0 = yLag[i] - meanY;
    const d0 = dyLag[i] - meanDL;
    const dep0 = dyDep[i] - meanDep;
    sYY += y0 * y0;
    sYD += y0 * d0;
    sDD += d0 * d0;
    sYdep += y0 * dep0;
    sDdep += d0 * dep0;
  }

  const det = sYY * sDD - sYD * sYD;
  if (det === 0) return 0;

  const phi = (sYdep * sDD - sDdep * sYD) / det;
  const theta = (sDdep * sYY - sYdep * sYD) / det;
  const intercept = meanDep - phi * meanY - theta * meanDL;

  const residuals = dyDep.map(
    (dep, i) => dep - (intercept + phi * yLag[i] + theta * dyLag[i]),
  );
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const residualVariance = n > 3 ? ssRes / (n - 3) : 0;
  const sePhi = residualVariance > 0 && sYY > 0
    ? Math.sqrt((residualVariance * sDD) / det)
    : 0;

  return sePhi === 0 ? 0 : phi / sePhi;
}

// Fixed asymptotic critical values (MacKinnon, constant-only, no trend) with
// linear interpolation between them for an APPROXIMATE p-value. This is not a
// full response-surface regression (sample-size dependent) — disclosed as
// "approx." wherever shown in the UI.
const CRITICAL_VALUES: [number, number][] = [
  [-3.43, 0.01],
  [-2.86, 0.05],
  [-2.57, 0.10],
];

function approximatePValue(tStat: number): number {
  if (tStat <= CRITICAL_VALUES[0][0]) return 0.01;
  for (let i = 0; i < CRITICAL_VALUES.length - 1; i++) {
    const [tHigh, pLow] = CRITICAL_VALUES[i];
    const [tLow, pHigh] = CRITICAL_VALUES[i + 1];
    if (tStat <= tLow) {
      const ratio = (tStat - tHigh) / (tLow - tHigh);
      return pLow + ratio * (pHigh - pLow);
    }
  }
  // Beyond the last tabulated point: extrapolate linearly, capped at 0.99.
  const [tLast, pLast] = CRITICAL_VALUES[CRITICAL_VALUES.length - 1];
  const slope = 0.1; // p per unit of t beyond the 10% threshold, a gentle ramp
  return Math.min(0.99, pLast + (tStat - tLast) * slope);
}

export function testCointegration(y: number[], x: number[]): CointegrationResult {
  const step1 = olsRegression(y, x);
  const adfStatistic = adfTStatistic(step1.residuals);
  const pValueApprox = approximatePValue(adfStatistic);

  return {
    hedgeRatio: step1.beta,
    intercept: step1.alpha,
    spread: step1.residuals,
    adfStatistic,
    pValueApprox,
    isCointegrated: pValueApprox <= 0.10,
  };
}
