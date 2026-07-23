"use client";

import { Globe, Radar, ShieldCheck } from "lucide-react";
import { BoltIcon } from "../icons";
import { useCountUp, useJitter } from "./useCountUp";
import { HOME_SCANNERS } from "./scanners-config";

function Row({
  icon,
  label,
  value,
  valueClassName = "text-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/6 py-3.5 first:border-t-0">
      <div className="flex items-center gap-2.5 text-zinc-400">
        {icon}
        <span className="text-[13px]">{label}</span>
      </div>
      <span className={`font-mono text-[15px] font-semibold tabular-nums ${valueClassName}`}>{value}</span>
    </div>
  );
}

export default function SystemStatusCard() {
  const markets = useCountUp(1240, 1400);
  const opportunities = useJitter(18, 3);
  const uptime = useCountUp(99.98, 1400);

  return (
    <div className="w-full rounded-2xl border border-white/12 bg-[#0B1220] p-5 shadow-2xl shadow-black/60 ring-1 ring-white/[0.02]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Live System Status</span>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#18D26E] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#18D26E]" />
          </span>
          <span className="text-[10px] font-bold tracking-wider text-[#18D26E]">LIVE</span>
        </div>
      </div>

      <div className="mt-1">
        <Row
          icon={<Globe className="h-4 w-4" />}
          label="Markets Monitored"
          value={Math.round(markets).toLocaleString()}
        />
        <Row
          icon={<Radar className="h-4 w-4" />}
          label="Scanners Online"
          value={String(HOME_SCANNERS.length)}
        />
        <Row
          icon={<BoltIcon className="h-4 w-4" />}
          label="Live Opportunities"
          value={String(opportunities)}
          valueClassName="text-[#2F80FF]"
        />
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          label="System Uptime"
          value={`${uptime.toFixed(2)}%`}
          valueClassName="text-[#18D26E]"
        />
      </div>
    </div>
  );
}
