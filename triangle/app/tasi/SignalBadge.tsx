import { signalColor, type EtfSignal, type PairSignal } from "./chart-theme";
import { SIGNAL_LABELS } from "@/lib/tasi/opportunityScore";
import { InfoTooltip } from "./InfoTooltip";
import { SIGNAL_TOOLTIPS } from "./tooltip-content";

export default function SignalBadge({ signal }: { signal: EtfSignal | PairSignal }) {
  const color = signalColor(signal);
  const badge = (
    <span
      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {SIGNAL_LABELS[signal]}
    </span>
  );

  const info = SIGNAL_TOOLTIPS[signal];
  if (!info) return badge;

  return <InfoTooltip content={info}>{badge}</InfoTooltip>;
}
