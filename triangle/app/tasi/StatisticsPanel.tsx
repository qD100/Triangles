import { InfoTooltip } from "./InfoTooltip";
import type { TooltipContent } from "./tooltip-content";

export interface StatItem {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  sublabel?: string;
  info?: TooltipContent;
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
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-500">
            <span>{item.label}</span>
            {item.info && (
              <InfoTooltip content={item.info}>
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] leading-none text-zinc-600 hover:text-zinc-300">
                  ⓘ
                </span>
              </InfoTooltip>
            )}
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
