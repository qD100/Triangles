/** Thins a long series for chart rendering while always keeping the last point. */
export function downsampleSeries<T>(items: T[], maxPoints: number): T[] {
  if (items.length <= maxPoints) return items;
  const step = Math.ceil(items.length / maxPoints);
  const sampled = items.filter((_, index) => index % step === 0);
  const last = items[items.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}
