"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import Sparkline from "./Sparkline";

const STATS = [
  { label: "Z-Score", value: "-2.81" },
  { label: "Spread", value: "-1.38" },
  { label: "Half-Life", value: "15.5d" },
  { label: "Score", value: "91" },
];

export default function TopOpportunity() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#EAB308]/25 bg-[#0B1220] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#EAB308]">
          <Trophy className="h-3.5 w-3.5" />
          Top Opportunity
        </div>
        <span className="rounded-md border border-[#18D26E]/30 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#18D26E]">
          Entry Long
        </span>
      </div>

      <div className="mt-3 font-mono text-2xl font-bold text-white">1120 / 1080</div>
      <div className="text-[11px] text-zinc-500">Al Rajhi Bank / Saudi National Bank</div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-white/6 bg-white/[0.02] px-1.5 py-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-zinc-600">{s.label}</div>
            <div className="mt-0.5 font-mono text-[13px] font-semibold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex-1">
        <Sparkline seed={909} colorHex="#EAB308" gradientId="spark-top-opportunity" />
      </div>

      <Link
        href="/tasi?tab=pairs"
        className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#2F80FF] py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_-8px_#2F80FF] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_32px_-4px_#2F80FF]"
      >
        View Opportunity →
      </Link>
    </div>
  );
}
