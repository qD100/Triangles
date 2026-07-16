import { STYLE_BAND_THRESHOLDS } from "./constants";
import type { StyleLabel } from "./types";

const LABELS: StyleLabel[] = [
  "Conservative",
  "Moderately Conservative",
  "Balanced",
  "Growth",
  "Aggressive",
];

export function scoreToStyleLabel(score: number): StyleLabel {
  const bandIndex = STYLE_BAND_THRESHOLDS.findIndex((threshold) => score < threshold);
  return bandIndex === -1 ? LABELS[LABELS.length - 1] : LABELS[bandIndex];
}
