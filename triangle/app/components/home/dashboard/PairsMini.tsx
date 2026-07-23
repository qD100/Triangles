"use client";

import { memo } from "react";
import { AnimatedNumber } from "./AnimatedValue";
import SignalBadge from "@/app/tasi/SignalBadge";
import type { PairsSnapshot } from "./types";

function PairsMini({ data }: { data: PairsSnapshot }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[13px] font-semibold text-white">{data.pairLabel}</div>
          <div className="text-[10px] text-zinc-600">{data.pairSectors}</div>
        </div>
        <SignalBadge signal={data.signal} />
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
        <Stat label="Correlation">
          <AnimatedNumber value={data.correlation} decimals={2} className="font-mono text-white" />
        </Stat>
        <Stat label="Cointegration">
          <AnimatedNumber value={data.cointegrationP} decimals={3} prefix="p=" className="font-mono text-white" />
        </Stat>
        <Stat label="Z-score">
          <AnimatedNumber
            value={data.zScore}
            decimals={2}
            className={`font-mono ${Math.abs(data.zScore) > 2 ? "text-[#2F80FF]" : "text-white"}`}
          />
        </Stat>
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

export default memo(PairsMini);
