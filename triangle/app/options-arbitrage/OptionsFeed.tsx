"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { OptionsOpportunity } from "@/app/components/hooks/useOptionsScanner";

type Props = {
  opportunities: OptionsOpportunity[];
};

const CONFIDENCE_COLOR: Record<OptionsOpportunity["confidence"], string> = {
  high: "text-emerald-400",
  medium: "text-yellow-400",
  low: "text-zinc-500",
};

export default function OptionsFeed({ opportunities }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40 sm:h-[640px] lg:h-[820px]">
      <div className="border-b border-zinc-800 p-5">
        <h2 className="text-xl font-bold tracking-wide text-emerald-400">DETECTED OPPORTUNITIES</h2>
        <p className="mt-1 text-sm text-zinc-500">Live feed across all four scanners</p>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-2 pb-2">
        {opportunities.length === 0 ? (
          <EmptyFeed />
        ) : (
          <AnimatePresence initial={false}>
            {opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                expanded={expandedId === opp.id}
                onToggle={() => setExpandedId((id) => (id === opp.id ? null : opp.id))}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
      <div className="text-xl font-semibold text-white">Waiting for opportunities...</div>
      <div className="mt-2 text-sm text-zinc-500">
        All four engines are scanning live Binance options data.
      </div>
    </div>
  );
}

function OpportunityCard({
  opp,
  expanded,
  onToggle,
}: {
  opp: OptionsOpportunity;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg px-1 py-1 transition-colors hover:bg-[#181818]"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-1.5 rounded-lg px-2 py-2 text-left sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="flex items-center gap-2 sm:w-24 sm:shrink-0 sm:flex-col sm:items-start sm:gap-0.5">
          <span className="text-[10px] font-semibold tracking-wider text-blue-400">{opp.underlying}</span>
          <span className="text-[10px] text-zinc-600">{opp.time}</span>
        </div>

        <div className="flex-1 truncate font-mono text-sm text-white">{opp.algorithm}</div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-sm font-bold text-emerald-400">+${opp.expected_profit.toFixed(2)}</span>
          <span className={`text-[10px] font-semibold uppercase ${CONFIDENCE_COLOR[opp.confidence]}`}>
            {opp.confidence}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-1 space-y-2 rounded-lg border border-zinc-800 bg-[#161616] p-3 text-xs">
          <Row label="Formula" value={opp.formula} mono />
          <Row label="Calculation" value={opp.calculation} mono />
          <Row label="Mispricing" value={`$${opp.mispricing.toFixed(4)}`} mono />
          <Row label="ROI" value={`${opp.roi_percent.toFixed(3)}%`} mono />
          <Row label="Suggested Trade" value={opp.suggested_trade} />
          <Row label="Estimated Net Profit" value={`$${opp.expected_profit.toFixed(4)}`} mono />

          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Inputs</div>
            <div className="mt-1 grid grid-cols-2 gap-1 font-mono text-[11px] text-zinc-400">
              {Object.entries(opp.inputs).map(([key, value]) => (
                <div key={key}>
                  {key}: <span className="text-zinc-300">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-0.5 break-words text-zinc-200 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
