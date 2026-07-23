import { mean } from "./statistics";

export function pearsonCorrelation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const x = a.slice(0, n);
  const y = b.slice(0, n);
  const mx = mean(x);
  const my = mean(y);

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return null;
  return cov / Math.sqrt(varX * varY);
}

export function rollingCorrelation(a: number[], b: number[], window: number): (number | null)[] {
  const n = Math.min(a.length, b.length);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = window - 1; i < n; i++) {
    out[i] = pearsonCorrelation(a.slice(i - window + 1, i + 1), b.slice(i - window + 1, i + 1));
  }
  return out;
}
