import type { ThresholdCrossing } from "@/lib/tasi/opportunityScore";

const EVENT_LABEL: Record<ThresholdCrossing["event"], string> = {
  ENTERED_EXTREME: "Entered extreme zone",
  ENTERED_ENTRY_ZONE: "Entered divergence zone",
  RETURNED_TO_NORMAL: "Returned to normal",
};

const EVENT_COLOR: Record<ThresholdCrossing["event"], string> = {
  ENTERED_EXTREME: "text-red-400",
  ENTERED_ENTRY_ZONE: "text-yellow-400",
  RETURNED_TO_NORMAL: "text-emerald-400",
};

export default function HistoricalSignalsLog({
  crossings,
  limit = 20,
}: {
  crossings: ThresholdCrossing[];
  limit?: number;
}) {
  const recent = [...crossings].reverse().slice(0, limit);

  if (recent.length === 0) {
    return (
      <p className="rounded-md border border-zinc-800 px-3 py-4 text-center text-xs text-zinc-500">
        No threshold crossings in the tracked history.
      </p>
    );
  }

  return (
    <ul className="max-h-64 divide-y divide-zinc-800 overflow-y-auto rounded-md border border-zinc-800 text-xs">
      {recent.map((c, i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-3 py-1.5">
          <span className="text-zinc-500">{c.date}</span>
          <span className={EVENT_COLOR[c.event]}>{EVENT_LABEL[c.event]}</span>
          <span className="tabular-nums text-white">z={c.zScore.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}
