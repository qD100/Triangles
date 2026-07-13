"use client";

import { useEffect, useState } from "react";
import type { SpreadRow } from "./useSpotFuturesTicker";

type Props = {
  symbol: string;
  connected: boolean;
  current: SpreadRow | null;
};

type Entry = {
  spot: number;
  futures: number;
  time: number;
};

function formatPrice(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export default function LivePosition({ symbol, connected, current }: Props) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Both adjustments happen during render (React's documented pattern for
  // deriving state from props) rather than in an effect: a new symbol has
  // nothing to do with the previous position, so it resets immediately;
  // otherwise the position opens and latches the instant live data first
  // arrives, never recomputing after that.
  const [trackedSymbol, setTrackedSymbol] = useState(symbol);

  if (symbol !== trackedSymbol) {
    setTrackedSymbol(symbol);
    setEntry(null);
    setUnsupported(false);
  } else if (!entry && current) {
    setEntry({ spot: current.spot, futures: current.futures, time: now });
  }

  useEffect(() => {
    if (!connected || current || entry) return;

    const timer = setTimeout(() => setUnsupported(true), 4000);

    return () => clearTimeout(timer);
  }, [connected, current, entry, symbol]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40">
      <div className="border-b border-zinc-800 p-5">
        <h2 className="text-xl font-bold tracking-wide text-emerald-400">LIVE POSITION</h2>
        <p className="mt-1 text-sm text-zinc-500">Current Spot-Futures Arbitrage Position</p>
      </div>

      {!entry && (
        <div className="p-5 text-sm text-zinc-500">
          {unsupported
            ? `No spot/futures position available for ${symbol} — this pair isn't on the futures monitor.`
            : "Waiting for live spread data…"}
        </div>
      )}

      {entry && current && (
        <PositionBody entry={entry} current={current} now={now} />
      )}
    </section>
  );
}

function PositionBody({
  entry,
  current,
  now,
}: {
  entry: Entry;
  current: SpreadRow;
  now: number;
}) {
  const durationSeconds = Math.max(0, Math.floor((now - entry.time) / 1000));

  const spotPnL = (current.spot - entry.spot) / entry.spot;
  const futurePnL = (entry.futures - current.futures) / entry.futures;
  const grossPnLPercent = (spotPnL + futurePnL) * 100;
  const pnlColor = grossPnLPercent >= 0 ? "text-emerald-400" : "text-red-400";

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
        <span className="text-xs text-zinc-500">Duration</span>
        <span className="font-mono text-sm text-white">{formatDuration(durationSeconds)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Live PnL</span>
        <span className={`font-mono text-sm font-bold ${pnlColor}`}>
          {grossPnLPercent >= 0 ? "+" : ""}
          {grossPnLPercent.toFixed(4)}%
        </span>
      </div>
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
