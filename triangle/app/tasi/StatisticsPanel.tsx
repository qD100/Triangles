export interface StatItem {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  sublabel?: string;
}

const TONE_CLASS: Record<NonNullable<StatItem["tone"]>, string> = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-white",
};

export default function StatisticsPanel({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="bg-[#111111] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            {item.label}
          </div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${TONE_CLASS[item.tone ?? "neutral"]}`}>
            {item.value}
          </div>
          {item.sublabel && (
            <div className="mt-0.5 text-[11px] text-zinc-500">{item.sublabel}</div>
          )}
        </div>
      ))}
    </div>
  );
}
