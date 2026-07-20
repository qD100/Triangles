"use client";

import type { PaperTradingStats } from "@/app/components/hooks/useOptionsScanner";

type Props = {
  stats: PaperTradingStats;
};

export default function OptionsPaperTradingPanel({ stats }: Props) {
  const hasData = stats.attempted > 0;

  return (
    <section className="rounded-xl border border-zinc-800 bg-[#111111] p-4 shadow-2xl shadow-black/40 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold tracking-wide text-purple-400">PAPER TRADING</h2>
          <p className="mt-0.5 max-w-2xl text-xs text-zinc-500">
            Simulated only — no real orders are placed. Every high-confidence opportunity&apos;s exact
            legs get re-priced against the live order book ~10s after detection, to see whether the
            edge would still have been capturable by the time a real order could go out.
          </p>
        </div>

        {stats.pending > 0 && (
          <span className="shrink-0 rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-purple-400 uppercase">
            {stats.pending} pending
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="mt-3 text-xs text-zinc-600">
          Waiting for the first high-confidence opportunity to simulate...
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Attempted" value={String(stats.attempted)} />
            <Stat
              label="Fill Rate"
              value={stats.fill_rate_percent === null ? "—" : `${stats.fill_rate_percent}%`}
              valueClass="text-emerald-400"
            />
            <Stat label="Theoretical P&L" value={formatSigned(stats.total_theoretical_profit)} />
            <Stat
              label="Realized P&L"
              value={formatSigned(stats.total_realized_profit)}
              valueClass={stats.total_realized_profit >= 0 ? "text-emerald-400" : "text-red-400"}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            <span>
              <span className="font-semibold text-emerald-400">{stats.held_up}</span> held up
            </span>
            <span>
              <span className="font-semibold text-yellow-400">{stats.still_profitable}</span> still
              profitable
            </span>
            <span>
              <span className="font-semibold text-zinc-400">{stats.vanished}</span> vanished
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className={`mt-0.5 font-mono text-lg font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

function formatSigned(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}
