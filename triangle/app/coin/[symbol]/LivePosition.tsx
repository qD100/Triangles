"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GearIcon } from "@/app/components/icons";
import type { SpreadRow } from "./useSpotFuturesTicker";
import PositionSettingsPanel, { type Conditions } from "./PositionSettingsPanel";

type Props = {
  symbol: string;
  connected: boolean;
  current: SpreadRow | null;
  conditions: Conditions;
  onConditionsChange: (next: Conditions) => void;
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

export default function LivePosition({ symbol, connected, current, conditions, onConditionsChange }: Props) {
  const [phase, setPhase] = useState<Phase>("scanning");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const bodyKey = unsupported && phase !== "open" ? "unsupported" : phase;

  return (
    <section className="flex flex-col rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40">
      <div className="relative border-b border-zinc-800 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-wide text-emerald-400">LIVE POSITION</h2>
            <p className="mt-1 text-sm text-zinc-500">Current Spot-Futures Arbitrage Position</p>
          </div>

          <button
            type="button"
            aria-label="Position settings"
            onClick={() => setSettingsOpen((value) => !value)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-[#181818] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white sm:h-9 sm:w-9"
          >
            <GearIcon />
          </button>
        </div>

        {settingsOpen && (
          <PositionSettingsPanel
            conditions={conditions}
            onUpdate={onConditionsChange}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>

      <AnimatePresence mode="wait">
        {bodyKey === "unsupported" && (
          <motion.div
            key="unsupported"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="p-5 text-sm text-zinc-500"
          >
            No spot/futures position available for {symbol}
            {" "}— this pair isn&apos;t on the futures monitor.
          </motion.div>
        )}

        {bodyKey === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ScanningBody symbol={symbol} current={current} conditions={conditions} />
          </motion.div>
        )}

        {bodyKey === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <IdleBody onResume={handleResume} />
          </motion.div>
        )}

        {bodyKey === "open" && entry && (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <OpenBody entry={entry} current={current} now={now} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// A honeycomb of triangles — fitting for "Triangle Terminal" — tessellated
// via alternating up/down triangle strips per row. Rather than each cell
// fading on its own random cycle (reads as a diffuse cloud), every cell
// shares the same pulse duration and its delay is derived purely from its
// x-position, so a single wavefront of light sweeps left-to-right through
// the grid on a loop — the same directional motion as the original sweep
// animation, just expressed through discrete triangles instead of a
// gradient bar. Driven by a shared CSS @keyframes (not framer-motion per
// triangle), so this stays cheap regardless of how many cells are on
// screen — the browser runs it natively instead of ~80 concurrent JS loops.
// Both fill and stroke sit at 0 opacity outside the wave, so only the
// travelling band of triangles is ever visible — the rest of the grid is
// fully invisible, not just faint.
const HONEYCOMB_COLS = 14;
const HONEYCOMB_ROWS = 3;
const HONEYCOMB_WIDTH = 900;
const HONEYCOMB_HEIGHT = 130;
const HONEYCOMB_SWEEP_SECONDS = 3.2;

type HoneycombTriangle = {
  points: string;
  delay: number;
};

function delayForX(centerX: number): number {
  return (centerX / HONEYCOMB_WIDTH) * HONEYCOMB_SWEEP_SECONDS;
}

function buildHoneycomb(): HoneycombTriangle[] {
  const triangles: HoneycombTriangle[] = [];
  const rowHeight = HONEYCOMB_HEIGHT / HONEYCOMB_ROWS;
  const colWidth = HONEYCOMB_WIDTH / HONEYCOMB_COLS;

  for (let row = 0; row < HONEYCOMB_ROWS; row++) {
    const y0 = row * rowHeight;
    const y1 = y0 + rowHeight;

    for (let col = 0; col < HONEYCOMB_COLS; col++) {
      const xLeft = col * colWidth;
      const xRight = xLeft + colWidth;
      const xMid = xLeft + colWidth / 2;

      triangles.push({
        points: `${xLeft},${y1} ${xRight},${y1} ${xMid},${y0}`,
        delay: delayForX(xMid),
      });
    }

    for (let col = 0; col < HONEYCOMB_COLS - 1; col++) {
      const xLeft = col * colWidth + colWidth / 2;
      const xRight = xLeft + colWidth;
      const xMid = xLeft + colWidth / 2;

      triangles.push({
        points: `${xLeft},${y0} ${xRight},${y0} ${xMid},${y1}`,
        delay: delayForX(xMid),
      });
    }
  }

  return triangles;
}

const HONEYCOMB_TRIANGLES = buildHoneycomb();

function ScanHoneycomb() {
  return (
    <svg
      viewBox={`0 0 ${HONEYCOMB_WIDTH} ${HONEYCOMB_HEIGHT}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {HONEYCOMB_TRIANGLES.map((tri, index) => (
        <polygon
          key={index}
          points={tri.points}
          fill="#34d399"
          stroke="#34d399"
          strokeWidth={0.75}
          vectorEffect="non-scaling-stroke"
          style={{
            fillOpacity: 0,
            strokeOpacity: 0,
            // Longhand properties, not the `animation` shorthand: browsers
            // expand shorthand style attributes into longhands when parsing
            // server-rendered HTML, which otherwise reads as a hydration
            // mismatch even though the values are identical. Also rounded
            // to a fixed precision — the browser's CSSOM normalizes long
            // decimal time values when it parses the server HTML, so an
            // untruncated JS float string mismatches what it stored.
            animationName: "honeycomb-pulse",
            animationDuration: `${HONEYCOMB_SWEEP_SECONDS.toFixed(3)}s`,
            animationTimingFunction: "ease-in-out",
            animationDelay: `${tri.delay.toFixed(3)}s`,
            animationIterationCount: "infinite",
          }}
        />
      ))}
    </svg>
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
    <div className="flex flex-col">
      <div className="relative flex h-28 items-center justify-center overflow-hidden border-b border-zinc-800 sm:h-32">
        <ScanHoneycomb />

        <div className="relative z-10 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              conditions.autoEntry ? "bg-emerald-400/80 animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className="text-sm font-semibold tracking-wide text-zinc-300">{statusLabel}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Current Spread ({symbol})</span>
          <span className={`font-mono text-sm font-bold ${current ? pnlColor(current.spread_percent) : "text-zinc-500"}`}>
            {current ? formatPercent(current.spread_percent) : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Current Expected Net Profit</span>
          <span className={`font-mono text-sm font-bold ${current ? pnlColor(current.net_percent) : "text-zinc-500"}`}>
            {current ? formatPercent(current.net_percent) : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <span className="text-xs text-zinc-500">Entry Conditions</span>
          <span className="font-mono text-xs text-zinc-400">
            Spread ≥ {conditions.minSpreadPercent.toFixed(2)}% · Net ≥ {conditions.minNetProfitPercent.toFixed(2)}%
          </span>
        </div>
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
