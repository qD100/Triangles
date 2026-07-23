import { rollingZScore } from "./statistics";

export const ZSCORE_WINDOWS = [20, 50, 100] as const;
export type ZScoreWindow = (typeof ZSCORE_WINDOWS)[number];

export type MultiWindowZScores = Record<ZScoreWindow, (number | null)[]>;

export function multiWindowZScore(values: number[]): MultiWindowZScores {
  const result = {} as MultiWindowZScores;
  for (const window of ZSCORE_WINDOWS) {
    result[window] = rollingZScore(values, window);
  }
  return result;
}

export function currentZScore(values: number[], window: number): number | null {
  const series = rollingZScore(values, window);
  return series.at(-1) ?? null;
}
