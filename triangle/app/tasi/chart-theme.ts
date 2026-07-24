// Shared color tokens for the terminal UI and Recharts components. Validated
// with the dataviz skill's palette validator against this app's actual dark
// surface (#09090b) — see the session's validator output. Dark-only by
// design (this product's identity is a dark trading terminal, not a
// light/dark togglable theme).
import type { EtfSignal, PairSignal } from "@/lib/tasi/opportunityScore";

export const SURFACE = "#111114";
export const SURFACE_2 = "#17171b";
export const BORDER = "#26262c";
export const TEXT_PRIMARY = "#e8e8ea";
export const TEXT_SECONDARY = "#9a9aa2";
export const TEXT_MUTED = "#6b6b73";
export const GRIDLINE = "#26262c";

export const CATEGORICAL = {
  blue: "#3987e5",
  orange: "#d95926",
  aqua: "#199e70",
  yellow: "#c98500",
  violet: "#9085e9",
} as const;

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#e66767",
} as const;

export type { EtfSignal, PairSignal };

// ENTRY_LONG/ENTRY_SHORT (and BUY_DISCOUNT/SELL_PREMIUM) intentionally share
// one color: both directions are the same underlying finding — a
// statistically significant divergence with an elevated convergence
// probability — so color no longer doubles as an implicit "this one's the
// buy, this one's the sell" cue the way green/red would.
const SIGNAL_COLOR: Record<EtfSignal | PairSignal, string> = {
  NORMAL: TEXT_SECONDARY,
  WATCH: STATUS.warning,
  ENTRY_LONG: STATUS.good,
  BUY_DISCOUNT: STATUS.good,
  ENTRY_SHORT: STATUS.good,
  SELL_PREMIUM: STATUS.good,
  EXIT: CATEGORICAL.blue,
  EXTREME_DIVERGENCE: STATUS.critical,
  EXTREME_MISPRICING: STATUS.critical,
  COINTEGRATION_BROKEN: TEXT_MUTED,
};

export function signalColor(signal: EtfSignal | PairSignal): string {
  return SIGNAL_COLOR[signal] ?? TEXT_SECONDARY;
}
