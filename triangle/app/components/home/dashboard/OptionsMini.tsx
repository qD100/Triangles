"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber, useChangeSignal } from "./AnimatedValue";
import type { OptionsSnapshot } from "./types";

function OptionsMini({ data }: { data: OptionsSnapshot }) {
  const pulse = useChangeSignal(data.bestStrategy);

  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
      <div className="font-mono text-[11px] font-semibold text-zinc-400">{data.symbol}</div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        <Stat label="Mispriced">
          <AnimatedNumber value={data.mispriced} className="font-mono text-white" />
        </Stat>
        <Stat label="Expected Return">
          <AnimatedNumber value={data.expectedReturnPct} decimals={2} suffix="%" prefix="+" className="font-mono text-[#F5A623]" />
        </Stat>
      </div>

      <motion.div
        key={pulse}
        initial={{ backgroundColor: "rgba(245,166,35,0.22)" }}
        animate={{ backgroundColor: "rgba(255,255,255,0.02)" }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="mt-2 flex items-center justify-between rounded-lg border border-white/6 px-2.5 py-1.5"
      >
        <span className="text-[9px] uppercase tracking-wide text-zinc-600">Best Strategy</span>
        <span className="text-[12px] font-semibold text-white">{data.bestStrategy}</span>
      </motion.div>

      <div className="mt-2 flex items-center justify-between border-t border-white/6 pt-2">
        <span className="text-[9px] uppercase tracking-wide text-zinc-600">Contracts</span>
        <AnimatedNumber value={data.contracts} className="font-mono text-[13px] font-semibold text-white" />
      </div>
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

export default memo(OptionsMini);
