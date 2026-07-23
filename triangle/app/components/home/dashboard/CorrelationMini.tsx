"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedValue";
import type { CorrelationCellState, CorrelationSnapshot } from "./types";

const STATE_COLOR: Record<CorrelationCellState, string> = {
  normal: "#2F80FF",
  high: "#18D26E",
  weak: "#F5A623",
  breaking: "#FF5B5B",
};

function CorrelationMini({ data }: { data: CorrelationSnapshot }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
      <div className="grid grid-cols-10 gap-1">
        {data.grid.map((cell, i) => (
          <motion.div
            key={i}
            className="aspect-square rounded-[3px]"
            animate={{ backgroundColor: STATE_COLOR[cell], opacity: cell === "normal" ? 0.35 : 0.9 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-[9px] text-zinc-500">
        <Legend color={STATE_COLOR.normal} label="Normal" />
        <Legend color={STATE_COLOR.high} label="High" />
        <Legend color={STATE_COLOR.weak} label="Weak" />
        <Legend color={STATE_COLOR.breaking} label="Breaking" />
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-white/6 pt-2 text-[11px]">
        <Stat label="Pairs Tracked">
          <AnimatedNumber value={data.pairsTracked} className="font-mono text-white" />
        </Stat>
        <Stat label="Strong Corr.">
          <AnimatedNumber value={data.strongCorrelations} className="font-mono text-[#18D26E]" />
        </Stat>
        <Stat label="Cointegrated">
          <AnimatedNumber value={data.cointegratedCount} className="font-mono text-[#EAB308]" />
        </Stat>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</div>
      <div className="text-[13px] font-semibold">{children}</div>
    </div>
  );
}

export default memo(CorrelationMini);
