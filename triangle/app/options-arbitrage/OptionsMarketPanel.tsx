"use client";

import { useState } from "react";
import type { MarketPanelData } from "@/app/components/hooks/useOptionsScanner";

type Props = {
  market: Record<string, MarketPanelData>;
  connected: boolean;
};

const UNDERLYINGS = ["BTC", "ETH"] as const;

export default function OptionsMarketPanel({ market, connected }: Props) {
  const [selected, setSelected] = useState<(typeof UNDERLYINGS)[number]>("BTC");
  const data = market[selected];

  return (
    <section className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40 sm:h-[640px] lg:h-[820px]">
      <div className="border-b border-zinc-800 p-5">
        <h2 className="text-xl font-bold tracking-wide text-blue-400">LIVE OPTIONS MARKET</h2>
        <p className="mt-1 text-sm text-zinc-500">Binance European Options — BTC &amp; ETH chains</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex gap-2">
          {UNDERLYINGS.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => setSelected(symbol)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                selected === symbol
                  ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                  : "border-zinc-800 bg-[#181818] text-zinc-400 hover:text-white"
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat
            label="Spot Price"
            value={data ? `$${data.spot.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
            highlight
          />
          <Stat label="Expiries" value={data ? String(data.expiries_count) : "—"} />
          <Stat label="Contracts Loaded" value={data ? String(data.contracts_count) : "—"} />
          <Stat label="Strikes" value={data ? String(data.strikes_count) : "—"} />
          <Stat label="Total Calls" value={data ? String(data.calls_count) : "—"} />
          <Stat label="Total Puts" value={data ? String(data.puts_count) : "—"} />
        </div>

        <div className="mt-4 rounded-lg border border-zinc-800 bg-[#181818] p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase tracking-wider text-zinc-500">Last Update</span>
            <span className="font-mono text-zinc-300">{data?.last_update ?? "—"}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="uppercase tracking-wider text-zinc-500">Connection</span>
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
              <span className="text-zinc-300">{connected ? "Live" : "Disconnected"}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#181818] p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 font-mono text-sm font-bold ${highlight ? "text-blue-400" : "text-white"}`}>{value}</div>
    </div>
  );
}
