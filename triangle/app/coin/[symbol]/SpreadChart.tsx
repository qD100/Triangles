"use client";

import { useEffect, useRef, useState } from "react";
import type { SpreadPoint, SpreadRow } from "./useSpotFuturesTicker";

type Props = {
  symbol: string;
  connected: boolean;
  current: SpreadRow | null;
  history: SpreadPoint[];
};

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 360;
const PAD_Y = 28;

// Fixed-width ring buffer: point spacing never rescales. It fills in from
// the left; once full, new samples slide the whole line left by exactly
// one slot instead of recomputing everyone's position.
const VISIBLE_POINTS = 40;
const RIGHT_MARGIN = 24;
const PLOT_WIDTH = VIEW_WIDTH - RIGHT_MARGIN;
const UNIT = PLOT_WIDTH / (VISIBLE_POINTS - 1);
const GRID_EVERY = 4;

// The backend's actual broadcast interval isn't a fixed 1s (three sequential
// Binance calls plus network latency push it to ~2-3s in practice), so the
// slide duration is measured from real arrival gaps instead of assumed —
// keeps the motion synced to true cadence rather than idling after a
// too-short animation. Clamped so a stall or a burst can't produce a
// degenerate (instant or glacial) slide.
const MIN_STEP_MS = 500;
const MAX_STEP_MS = 6000;
const DEFAULT_STEP_MS = 2000;

function formatPrice(value: number) {
  const maximumFractionDigits = value >= 1 ? 2 : 6;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits })}`;
}

export default function SpreadChart({ symbol, connected, current, history }: Props) {
  const [unsupported, setUnsupported] = useState(false);
  const [hasGeometry, setHasGeometry] = useState(false);
  const [trackedSymbol, setTrackedSymbol] = useState(symbol);

  if (symbol !== trackedSymbol) {
    setTrackedSymbol(symbol);
    setUnsupported(false);
    setHasGeometry(false);
  }

  useEffect(() => {
    if (!connected || current) return;

    const timer = setTimeout(() => setUnsupported(true), 4000);

    return () => clearTimeout(timer);
  }, [connected, current, symbol]);

  const groupRef = useRef<SVGGElement>(null);
  const gridRef = useRef<SVGGElement>(null);
  const spotPathRef = useRef<SVGPathElement>(null);
  const futuresPathRef = useRef<SVGPathElement>(null);
  const gapPathRef = useRef<SVGPathElement>(null);
  const spotDotRef = useRef<SVGGElement>(null);
  const futuresDotRef = useRef<SVGGElement>(null);

  const plottedRef = useRef<SpreadPoint[]>([]);
  const totalCountRef = useRef(0);
  const lastAppliedTimeRef = useRef<number | null>(null);
  const lastArrivalWallClockRef = useRef<number | null>(null);
  const animatingRef = useRef(false);
  const yScaleRef = useRef({ min: 0, range: 1 });

  function toY(value: number) {
    const usable = VIEW_HEIGHT - PAD_Y * 2;
    return PAD_Y + usable - ((value - yScaleRef.current.min) / yScaleRef.current.range) * usable;
  }

  function draw(points: SpreadPoint[], totalCount: number) {
    if (points.length < 2) return;

    const values = points.flatMap((point) => [point.spot, point.futures]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    yScaleRef.current = { min, range: max - min || max * 0.001 || 1 };

    const spotPath = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${(index * UNIT).toFixed(2)},${toY(point.spot).toFixed(2)}`)
      .join(" ");

    const futuresPath = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${(index * UNIT).toFixed(2)},${toY(point.futures).toFixed(2)}`)
      .join(" ");

    const futuresReversed = points
      .map((point, index) => [index * UNIT, toY(point.futures)] as const)
      .reverse()
      .map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");

    spotPathRef.current?.setAttribute("d", spotPath);
    futuresPathRef.current?.setAttribute("d", futuresPath);
    gapPathRef.current?.setAttribute("d", `${spotPath} ${futuresReversed} Z`);

    if (gridRef.current) {
      const startIndex = totalCount - points.length;
      const lines: string[] = [];

      for (let i = 0; i < points.length; i++) {
        if ((startIndex + i) % GRID_EVERY === 0) {
          const x = (i * UNIT).toFixed(2);
          lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${VIEW_HEIGHT}" stroke="#1f1f23" stroke-width="1" />`);
        }
      }

      gridRef.current.innerHTML = lines.join("");
    }
  }

  function updateDots(point: SpreadPoint, x: number, stepMs: number) {
    if (spotDotRef.current) {
      spotDotRef.current.style.transition = `transform ${stepMs * 0.9}ms ease-out`;
      spotDotRef.current.style.transform = `translate(${x}px, ${toY(point.spot).toFixed(2)}px)`;
    }

    if (futuresDotRef.current) {
      futuresDotRef.current.style.transition = `transform ${stepMs * 0.9}ms ease-out`;
      futuresDotRef.current.style.transform = `translate(${x}px, ${toY(point.futures).toFixed(2)}px)`;
    }
  }

  function appendPoint(point: SpreadPoint) {
    totalCountRef.current += 1;

    const now = Date.now();
    const stepMs =
      lastArrivalWallClockRef.current === null
        ? DEFAULT_STEP_MS
        : Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, now - lastArrivalWallClockRef.current));
    lastArrivalWallClockRef.current = now;

    const plotted = plottedRef.current;

    if (plotted.length < VISIBLE_POINTS) {
      plotted.push(point);
      plottedRef.current = plotted;
      setHasGeometry(plotted.length >= 2);

      if (plotted.length >= 2) {
        draw(plotted, totalCountRef.current);
        updateDots(point, (plotted.length - 1) * UNIT, stepMs);
      }

      return;
    }

    if (animatingRef.current) return;
    animatingRef.current = true;

    const withNew = [...plotted, point];
    draw(withNew, totalCountRef.current);
    updateDots(point, PLOT_WIDTH, stepMs);

    const group = groupRef.current;
    const grid = gridRef.current;

    if (group) {
      group.style.transition = "none";
      group.style.transform = "translateX(0px)";
    }

    if (grid) {
      grid.style.transition = "none";
      grid.style.transform = "translateX(0px)";
    }

    requestAnimationFrame(() => {
      if (group) {
        group.style.transition = `transform ${stepMs}ms linear`;
        group.style.transform = `translateX(${-UNIT}px)`;
      }

      if (grid) {
        grid.style.transition = `transform ${stepMs}ms linear`;
        grid.style.transform = `translateX(${-UNIT}px)`;
      }
    });

    setTimeout(() => {
      const trimmed = withNew.slice(1);
      plottedRef.current = trimmed;

      if (group) {
        group.style.transition = "none";
        group.style.transform = "translateX(0px)";
      }

      if (grid) {
        grid.style.transition = "none";
        grid.style.transform = "translateX(0px)";
      }

      draw(trimmed, totalCountRef.current);
      animatingRef.current = false;
    }, stepMs);
  }

  useEffect(() => {
    const latest = history[history.length - 1];
    if (!latest) return;
    if (latest.time === lastAppliedTimeRef.current) return;

    lastAppliedTimeRef.current = latest.time;
    appendPoint(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  useEffect(() => {
    plottedRef.current = [];
    totalCountRef.current = 0;
    lastAppliedTimeRef.current = null;
    lastArrivalWallClockRef.current = null;
    animatingRef.current = false;

    for (const el of [groupRef.current, gridRef.current]) {
      if (!el) continue;
      el.style.transition = "none";
      el.style.transform = "translateX(0px)";
    }
  }, [symbol]);

  const spreadColor =
    current === null
      ? "text-zinc-500"
      : current.spread_percent >= 0
        ? "text-emerald-400"
        : "text-red-400";

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-4">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-zinc-400">Spot</span>
            <span className="font-mono font-semibold text-white">
              {current ? formatPrice(current.spot) : "—"}
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="text-zinc-400">Futures</span>
            <span className="font-mono font-semibold text-white">
              {current ? formatPrice(current.futures) : "—"}
            </span>
          </span>
        </div>

        <div className={`font-mono text-sm font-bold ${spreadColor}`}>
          {current ? `${current.spread_percent >= 0 ? "+" : ""}${current.spread_percent.toFixed(4)}%` : "—"}
        </div>
      </div>

      <div className="relative h-[380px] w-full sm:h-[460px]">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          className={`h-full w-full overflow-hidden transition-opacity duration-300 ${hasGeometry ? "opacity-100" : "opacity-0"}`}
        >
          {/* static horizontal reference lines */}
          <line x1={0} y1={VIEW_HEIGHT / 2} x2={PLOT_WIDTH} y2={VIEW_HEIGHT / 2} stroke="#1f1f23" strokeWidth={1} />

          {/* moving vertical grid, synced to the same scroll as the data */}
          <g ref={gridRef} />

          <g ref={groupRef}>
            <path ref={gapPathRef} fill="rgba(168,85,247,0.18)" stroke="none" />
            <path ref={spotPathRef} fill="none" stroke="#3b82f6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <path ref={futuresPathRef} fill="none" stroke="#facc15" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </g>

          {/* pulsing live-value markers, pinned at the right edge */}
          <g ref={spotDotRef}>
            <circle r={9} fill="#3b82f6" fillOpacity={0.4} className="animate-ping" />
            <circle r={4} fill="#3b82f6" />
          </g>

          <g ref={futuresDotRef}>
            <circle r={9} fill="#facc15" fillOpacity={0.4} className="animate-ping" />
            <circle r={4} fill="#facc15" />
          </g>
        </svg>

        {!hasGeometry && !unsupported && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-zinc-500">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
            Collecting live spread data…
          </div>
        )}

        {unsupported && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-zinc-500">
            No spot/futures spread tracked for {symbol}
            {" "}— this pair isn&apos;t on the futures monitor.
          </div>
        )}
      </div>
    </section>
  );
}
