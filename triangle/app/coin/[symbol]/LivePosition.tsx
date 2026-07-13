"use client";

import { useEffect, useState } from "react";
import type { SpreadRow } from "./useSpotFuturesTicker";
import type { Conditions } from "./SpotFuturesConditions";

type Props = {
  symbol: string;
  connected: boolean;
  current: SpreadRow | null;
  conditions: Conditions;
};

type Entry = {
  spot: number;
  futures: number;
  time: number;
  spread: number;
};

type Phase = "scanning" | "open" | "idle";

function formatPrice(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}%`;
}

function pnlColor(value: number) {
  return value >= 0 ? "text-emerald-400" : "text-red-400";
}

function formatDuration(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m ${seconds}s`;
}

export default function LivePosition({ symbol, connected, current, conditions }: Props) {
  const [phase, setPhase] = useState<Phase>("scanning");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // A new symbol has nothing to do with the previous one's position — reset
  // during render (state-adjustment-on-prop-change pattern) rather than in
  // an effect, so switching coins clears everything immediately.
  const [trackedSymbol, setTrackedSymbol] = useState(symbol);

  if (symbol !== trackedSymbol) {
    setTrackedSymbol(symbol);
    setPhase("scanning");
    setEntry(null);
    setUnsupported(false);
  } else if (
    phase === "scanning" &&
    conditions.autoEntry &&
    current &&
    current.spread_percent >= conditions.minSpreadPercent &&
    current.net_percent >= conditions.minNetProfitPercent
  ) {
    // Entry conditions satisfied on a live tick — also a render-time
    // adjustment, not an effect: opening the paper trade is a direct
    // function of the current spread data, latched once and never
    // recomputed until the position is reset.
    setPhase("open");
    setEntry({ spot: current.spot, futures: current.futures, time: now, spread: current.spread_percent });
  }

  useEffect(() => {
    if (!connected || current || phase !== "scanning") return;

    const timer = setTimeout(() => setUnsupported(true), 4000);

    return () => clearTimeout(timer);
  }, [connected, current, phase, symbol]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  function handleReset() {
    setEntry(null);
    setPhase(conditions.autoResetAfterClose ? "scanning" : "idle");
    setUnsupported(false);
  }

  function handleResume() {
    setPhase("scanning");
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40">
      <div className="border-b border-zinc-800 p-5">
        <h2 className="text-xl font-bold tracking-wide text-emerald-400">LIVE POSITION</h2>
        <p className="mt-1 text-sm text-zinc-500">Current Spot-Futures Arbitrage Position</p>
      </div>

      {unsupported && phase !== "open" && (
        <div className="p-5 text-sm text-zinc-500">
          No spot/futures position available for {symbol}
          {" "}— this pair isn&apos;t on the futures monitor.
        </div>
      )}

      {!unsupported && phase === "scanning" && (
        <ScanningBody symbol={symbol} current={current} conditions={conditions} />
      )}

      {!unsupported && phase === "idle" && <IdleBody onResume={handleResume} />}

      {phase === "open" && entry && (
        <OpenBody entry={entry} current={current} now={now} onReset={handleReset} />
      )}
    </section>
  );
}

function ScanningBody({
  symbol,
  current,
  conditions,
}: {
  symbol: string;
  current: SpreadRow | null;
  conditions: Conditions;
}) {
  const statusLabel = conditions.autoEntry ? "Scanning..." : "Waiting for Entry...";

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            conditions.autoEntry ? "bg-zinc-500 animate-pulse" : "bg-zinc-600"
          }`}
        />
        <span className="text-[10px] font-semibold tracking-wider text-zinc-500">{statusLabel}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Current Spread ({symbol})</span>
        <span className={`font-mono text-sm font-bold ${current ? pnlColor(current.spread_percent) : "text-zinc-500"}`}>
          {current ? formatPercent(current.spread_percent) : "—"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Current Net Profit</span>
        <span className={`font-mono text-sm font-bold ${current ? pnlColor(current.net_percent) : "text-zinc-500"}`}>
          {current ? formatPercent(current.net_percent) : "—"}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
        <span className="text-xs text-zinc-500">Condition</span>
        <span className="font-mono text-xs text-zinc-400">
          Spread ≥ {conditions.minSpreadPercent.toFixed(2)}% · Net ≥ {conditions.minNetProfitPercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function IdleBody({ onResume }: { onResume: () => void }) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
        <span className="text-[10px] font-semibold tracking-wider text-zinc-500">POSITION CLOSED</span>
      </div>

      <p className="text-sm text-zinc-500">
        Auto Reset After Close is off, so scanning is paused.
      </p>

      <button
        type="button"
        onClick={onResume}
        className="self-start rounded-lg border border-blue-500/50 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/25"
      >
        Resume Scanning
      </button>
    </div>
  );
}

function OpenBody({
  entry,
  current,
  now,
  onReset,
}: {
  entry: Entry;
  current: SpreadRow | null;
  now: number;
  onReset: () => void;
}) {
  const durationSeconds = Math.max(0, Math.floor((now - entry.time) / 1000));

  const spotPnL = current ? (current.spot - entry.spot) / entry.spot : 0;
  const futurePnL = current ? (entry.futures - current.futures) / entry.futures : 0;
  const grossPnLPercent = (spotPnL + futurePnL) * 100;

  const openedAt = new Date(entry.time).toLocaleTimeString(undefined, { hour12: false });

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold tracking-wider text-zinc-500">OPEN</span>
        </div>
        <span className="text-[10px] text-zinc-600">{openedAt}</span>
      </div>

      <PositionRow
        badge="BUY"
        badgeClass="bg-emerald-500/15 text-emerald-400"
        label="Spot"
        value={`$${formatPrice(entry.spot)}`}
      />

      <PositionRow
        badge="SHORT"
        badgeClass="bg-red-500/15 text-red-400"
        label="Futures"
        value={`$${formatPrice(entry.futures)}`}
      />

      <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
        <span className="text-xs text-zinc-500">Entry Spread</span>
        <span className="font-mono text-sm text-white">{formatPercent(entry.spread)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Current Spread</span>
        <span className={`font-mono text-sm ${current ? pnlColor(current.spread_percent) : "text-zinc-500"}`}>
          {current ? formatPercent(current.spread_percent) : "—"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Duration</span>
        <span className="font-mono text-sm text-white">{formatDuration(durationSeconds)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Live PnL</span>
        <span className={`font-mono text-sm font-bold ${pnlColor(grossPnLPercent)}`}>
          {formatPercent(grossPnLPercent)}
        </span>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-1 self-start rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20"
      >
        Reset Position
      </button>
    </div>
  );
}

function PositionRow({
  badge,
  badgeClass,
  label,
  value,
}: {
  badge: string;
  badgeClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
          {badge}
        </span>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <span className="font-mono text-sm text-white">{value}</span>
    </div>
  );
}
