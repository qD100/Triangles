export type EtfSignal =
  | "NORMAL"
  | "WATCH"
  | "BUY_DISCOUNT"
  | "SELL_PREMIUM"
  | "EXTREME_MISPRICING";

export type PairSignal =
  | "NORMAL"
  | "WATCH"
  | "ENTRY_LONG"
  | "ENTRY_SHORT"
  | "EXIT"
  | "EXTREME_DIVERGENCE"
  | "COINTEGRATION_BROKEN";

export interface SignalThresholds {
  entry: number;
  exit: number;
  extreme: number;
}

export const DEFAULT_THRESHOLDS: SignalThresholds = {
  entry: 2,
  exit: 0.5,
  extreme: 3,
};

export function classifyEtfSignal(
  zScore: number | null,
  thresholds: SignalThresholds = DEFAULT_THRESHOLDS,
): EtfSignal {
  if (zScore === null) return "NORMAL";
  const az = Math.abs(zScore);
  if (az > thresholds.extreme) return "EXTREME_MISPRICING";
  if (zScore < -thresholds.entry) return "BUY_DISCOUNT";
  if (zScore > thresholds.entry) return "SELL_PREMIUM";
  if (az > 1) return "WATCH";
  return "NORMAL";
}

export function classifyPairSignal(
  zScore: number | null,
  cointegrationPValue: number | null,
  thresholds: SignalThresholds = DEFAULT_THRESHOLDS,
): PairSignal {
  if (cointegrationPValue !== null && cointegrationPValue > 0.10) {
    return "COINTEGRATION_BROKEN";
  }
  if (zScore === null) return "NORMAL";
  const az = Math.abs(zScore);
  if (az > thresholds.extreme) return "EXTREME_DIVERGENCE";
  if (zScore < -thresholds.entry) return "ENTRY_LONG";
  if (zScore > thresholds.entry) return "ENTRY_SHORT";
  if (az < thresholds.exit) return "EXIT";
  if (az > 1) return "WATCH";
  return "NORMAL";
}

// A disclosed heuristic, not an industry-standard formula: 0-100, weighted
// from z-score magnitude (how far from fair value), statistical confidence
// (e.g. 1 - ADF p-value, or correlation strength), and reversion speed
// (shorter half-life scores higher). Each component is capped so no single
// input can dominate the score.
export function computeOpportunityScore(input: {
  zScore: number | null;
  confidence: number | null; // 0-1
  halfLifeDays: number | null;
}): number {
  const zComponent = Math.min(Math.abs(input.zScore ?? 0) / 3, 1) * 50;
  const confidenceComponent = Math.min(Math.max(input.confidence ?? 0, 0), 1) * 30;
  const speedComponent =
    input.halfLifeDays && input.halfLifeDays > 0
      ? Math.max(0, 1 - input.halfLifeDays / 60) * 20
      : 0;
  return Math.round(zComponent + confidenceComponent + speedComponent);
}

export interface ThresholdCrossing {
  date: string;
  zScore: number;
  event: "ENTERED_EXTREME" | "ENTERED_ENTRY_ZONE" | "RETURNED_TO_NORMAL";
}

// Scans a z-score series for the historical signals log: each time the
// series crosses into an extreme zone, into an entry zone, or back to
// normal. Derived from data already fetched for the charts — no separate
// backend computation needed.
export function findThresholdCrossings(
  series: { date: string; zScore: number | null }[],
  thresholds: SignalThresholds = DEFAULT_THRESHOLDS,
): ThresholdCrossing[] {
  type Zone = "normal" | "entry" | "extreme";
  const crossings: ThresholdCrossing[] = [];
  let zone: Zone = "normal";

  for (const point of series) {
    if (point.zScore === null) continue;
    const az = Math.abs(point.zScore);
    const nextZone: Zone =
      az > thresholds.extreme ? "extreme" : az > thresholds.entry ? "entry" : "normal";

    if (nextZone !== zone) {
      crossings.push({
        date: point.date,
        zScore: point.zScore,
        event:
          nextZone === "extreme"
            ? "ENTERED_EXTREME"
            : nextZone === "entry"
              ? "ENTERED_ENTRY_ZONE"
              : "RETURNED_TO_NORMAL",
      });
      zone = nextZone;
    }
  }

  return crossings;
}

export const SIGNAL_LABELS: Record<EtfSignal | PairSignal, string> = {
  NORMAL: "Normal",
  WATCH: "Watch",
  BUY_DISCOUNT: "Buy Discount",
  SELL_PREMIUM: "Sell Premium",
  EXTREME_MISPRICING: "Extreme Mispricing",
  ENTRY_LONG: "Entry Long",
  ENTRY_SHORT: "Entry Short",
  EXIT: "Exit",
  EXTREME_DIVERGENCE: "Extreme Divergence",
  COINTEGRATION_BROKEN: "Cointegration Broken",
};
