import { mean } from "./statistics";

export interface OlsResult {
  beta: number; // slope
  alpha: number; // intercept
  residuals: number[];
  rSquared: number;
  standardErrorBeta: number;
}

// Simple OLS: y = alpha + beta * x + residual
export function olsRegression(y: number[], x: number[]): OlsResult {
  const n = Math.min(y.length, x.length);
  const xs = x.slice(0, n);
  const ys = y.slice(0, n);
  const mx = mean(xs);
  const my = mean(ys);

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const beta = sxx === 0 ? 0 : sxy / sxx;
  const alpha = my - beta * mx;

  const residuals = ys.map((yi, i) => yi - (alpha + beta * xs[i]));

  const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
  const ssTot = ys.reduce((sum, yi) => sum + (yi - my) ** 2, 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Standard error of beta, for significance/confidence use downstream.
  const residualVariance = n > 2 ? ssRes / (n - 2) : 0;
  const standardErrorBeta = sxx === 0 ? 0 : Math.sqrt(residualVariance / sxx);

  return { beta, alpha, residuals, rSquared, standardErrorBeta };
}
