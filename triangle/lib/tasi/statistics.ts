export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Sample standard deviation (n-1 denominator).
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function logReturns(values: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i] > 0 && values[i - 1] > 0) {
      returns.push(Math.log(values[i] / values[i - 1]));
    }
  }
  return returns;
}

export function rollingMean(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = window - 1; i < values.length; i++) {
    out[i] = mean(values.slice(i - window + 1, i + 1));
  }
  return out;
}

export function rollingStd(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = window - 1; i < values.length; i++) {
    out[i] = stddev(values.slice(i - window + 1, i + 1));
  }
  return out;
}

export function rollingZScore(values: number[], window: number): (number | null)[] {
  const means = rollingMean(values, window);
  const stds = rollingStd(values, window);
  return values.map((v, i) => {
    const m = means[i];
    const s = stds[i];
    if (m === null || s === null || s === 0) return null;
    return (v - m) / s;
  });
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
}

export function histogram(values: number[], binCount = 20): HistogramBin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / binCount || 1;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    binStart: min + i * width,
    binEnd: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / width));
    bins[Math.max(0, idx)].count += 1;
  }
  return bins;
}

// Standard normal PDF, for overlaying a fitted distribution curve on a histogram.
export function normalPdf(x: number, mu: number, sigma: number): number {
  if (sigma === 0) return 0;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}
