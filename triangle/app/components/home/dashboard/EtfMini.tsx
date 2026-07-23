"use client";

import { memo } from "react";
import { AnimatedNumber, FlashNumber } from "./AnimatedValue";
import SignalBadge from "@/app/tasi/SignalBadge";
import type { EtfSnapshot } from "./types";

function EtfMini({ data }: { data: EtfSnapshot }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[13px] font-semibold text-white">{data.symbol}</div>
        <SignalBadge signal={data.signal} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        <Stat label="ETF">
          <AnimatedNumber value={data.etfPrice} decimals={2} className="font-mono text-white" />
        </Stat>
        <Stat label="Index NAV">
          <AnimatedNumber value={data.indexNav} decimals={2} className="font-mono text-white" />
        </Stat>
        <Stat label="Premium">
          <FlashNumber
            value={data.premiumPct}
            direction={data.premiumDirection}
            decimals={2}
            prefix={data.premiumPct >= 0 ? "+" : ""}
            restColor="#e4e4e7"
          />
        </Stat>
        <Stat label="Opportunity">
          <AnimatedNumber value={data.opportunityScore} className="font-mono text-[#14B8A6]" />
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

export default memo(EtfMini);
