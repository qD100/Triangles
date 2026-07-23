"use client";

import { memo } from "react";
import { AnimatedNumber, FlashNumber } from "./AnimatedValue";
import type { SpotFutureSnapshot } from "./types";

function SpotFutureMini({ data }: { data: SpotFutureSnapshot }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
      <div className="font-mono text-[11px] font-semibold text-zinc-400">{data.symbol}</div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        <Stat label="Spot">
          <AnimatedNumber value={data.spot} decimals={0} className="font-mono text-white" />
        </Stat>
        <Stat label="Future">
          <AnimatedNumber value={data.future} decimals={0} className="font-mono text-white" />
        </Stat>
        <Stat label="Basis">
          <FlashNumber
            value={data.basisPct}
            direction={data.basisDirection}
            decimals={2}
            prefix={data.basisPct >= 0 ? "+" : ""}
            restColor="#e4e4e7"
            upColor="#18D26E"
            downColor="#F5A623"
          />
        </Stat>
        <Stat label="Funding">
          <AnimatedNumber value={data.fundingPct} decimals={3} suffix="%" className="font-mono text-white" />
        </Stat>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-white/6 pt-2">
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

export default memo(SpotFutureMini);
