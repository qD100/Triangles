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
// Binance calls plus network latency push it to ~2-3s in practice) and has
// some jitter. Rather than animate a fixed-duration CSS transition per tick
// (which sits motionless whenever the next tick is late), the slide is
// driven every animation frame from a rolling velocity estimate — motion
// never stops, and the estimate self-corrects as real gaps are measured.
const MIN_STEP_MS = 500;
const MAX_STEP_MS = 6000;
const DEFAULT_STEP_MS = 2000;
const DEFAULT_VELOCITY = UNIT / DEFAULT_STEP_MS;

// A grid that scrolled with the data could never show how far the data
// moved — the two are travelling together, so their relative motion is
// zero. This grid stays pinned to the viewport (never transformed) and
// acts as a ruler: the line moves under it, so crossing N cells is a
// direct, measurable readout of how much spot/futures shifted.
const GRID_PERIOD = GRID_EVERY * UNIT;
const GRID_LINE_X: number[] = [];
for (let x = PLOT_WIDTH; x >= 0; x -= GRID_PERIOD) GRID_LINE_X.push(x);

const H_GRID_LINES = 4;
const GRID_LINE_Y: number[] = Array.from(
  { length: H_GRID_LINES + 1 },
  (_, i) => (VIEW_HEIGHT / H_GRID_LINES) * i
);

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
  const spotPathRef = useRef<SVGPathElement>(null);
  const futuresPathRef = useRef<SVGPathElement>(null);
  const gapPathRef = useRef<SVGPathElement>(null);
  const spotDotGroupRef = useRef<SVGGElement>(null);
  const futuresDotGroupRef = useRef<SVGGElement>(null);

  const plottedRef = useRef<SpreadPoint[]>([]);
  const lastAppliedTimeRef = useRef<number | null>(null);
  const lastCommitWallClockRef = useRef<number | null>(null);
  const velocityRef = useRef(DEFAULT_VELOCITY);
  const yScaleRef = useRef({ min: 0, range: 1 });

  function toY(value: number) {
    const usable = VIEW_HEIGHT - PAD_Y * 2;
    return PAD_Y + usable - ((value - yScaleRef.current.min) / yScaleRef.current.range) * usable;
  }

  // The dots live inside the SAME sliding group as the paths and are drawn
  // from the exact same coordinates as each path's last vertex — they can
  // never visually detach from the line because they're the same point.
  function draw(points: SpreadPoint[]) {
    if (points.length < 2) return;

    const values = points.flatMap((point) => [point.spot, point.futures]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    yScaleRef.current = { min, range: max - min || max * 0.001 || 1 };

    const spotXY = points.map((point, index) => [index * UNIT, toY(point.spot)] as const);
    const futuresXY = points.map((point, index) => [index * UNIT, toY(point.futures)] as const);

    const spotPath = spotXY.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const futuresPath = futuresXY.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const futuresReversed = [...futuresXY].reverse().map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

    spotPathRef.current?.setAttribute("d", spotPath);
    futuresPathRef.current?.setAttribute("d", futuresPath);
    gapPathRef.current?.setAttribute("d", `${spotPath} ${futuresReversed} Z`);

    const [lastSpotX, lastSpotY] = spotXY[spotXY.length - 1];
    const [lastFuturesX, lastFuturesY] = futuresXY[futuresXY.length - 1];

    // Position is set on the wrapping <g> via the SVG attribute; the pulsing
    // ring inside is positioned at local (0,0) and animates its own CSS
    // transform (scale) via animate-ping. Putting both on the same element
    // let the CSS animation's transform silently override the attribute
    // transform each keyframe, which is what caused the detached ghost dot.
    spotDotGroupRef.current?.setAttribute("transform", `translate(${lastSpotX.toFixed(2)},${lastSpotY.toFixed(2)})`);
    futuresDotGroupRef.current?.setAttribute("transform", `translate(${lastFuturesX.toFixed(2)},${lastFuturesY.toFixed(2)})`);
  }

  function resetSlide() {
    groupRef.current?.style.setProperty("transform", "translateX(0px)");
  }

  function appendPoint(point: SpreadPoint) {
    const now = Date.now();

    if (plottedRef.current.length >= VISIBLE_POINTS && lastCommitWallClockRef.current !== null) {
      const gap = Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, now - lastCommitWallClockRef.current));
      // Blend rather than snap to the latest gap, so one jittery tick
      // doesn't visibly jolt the scroll speed.
      velocityRef.current = velocityRef.current * 0.5 + (UNIT / gap) * 0.5;
    }

    lastCommitWallClockRef.current = now;

    const plotted = plottedRef.current;

    if (plotted.length < VISIBLE_POINTS) {
      plotted.push(point);
      plottedRef.current = plotted;
      setHasGeometry(plotted.length >= 2);

      if (plotted.length >= 2) draw(plotted);

      return;
    }

    const trimmed = [...plotted.slice(1), point];
    plottedRef.current = trimmed;

    // Resets instantly and looks seamless: the per-frame loop below had
    // already slid the previous view up to (at most) one full UNIT as a
    // preview of this exact moment.
    resetSlide();
    draw(trimmed);
  }

  // Runs forever, continuously previewing the next slide based on the
  // measured cadence — the line is always in motion, never resting until
  // real data confirms (or corrects) how far it should have moved.
  useEffect(() => {
    let frame: number;

    function tick() {
      frame = requestAnimationFrame(tick);

      if (plottedRef.current.length < VISIBLE_POINTS || lastCommitWallClockRef.current === null) return;

      const elapsed = Date.now() - lastCommitWallClockRef.current;
      const offset = Math.min(elapsed * velocityRef.current, UNIT);

      groupRef.current?.style.setProperty("transform", `translateX(${(-offset).toFixed(2)}px)`);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

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
    lastAppliedTimeRef.current = null;
    lastCommitWallClockRef.current = null;
    velocityRef.current = DEFAULT_VELOCITY;
    resetSlide();
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
          {/* fixed ruler grid — pinned to the viewport, never transformed,
              so the line's motion under it is directly measurable */}
          <g>
            {GRID_LINE_X.map((x) => (
              <line key={`v${x}`} x1={x} y1={0} x2={x} y2={VIEW_HEIGHT} stroke="#1f1f23" strokeWidth={1} />
            ))}
            {GRID_LINE_Y.map((y) => (
              <line key={`h${y}`} x1={0} y1={y} x2={PLOT_WIDTH} y2={y} stroke="#1f1f23" strokeWidth={1} />
            ))}
          </g>

          <g ref={groupRef}>
            <path ref={gapPathRef} fill="rgba(168,85,247,0.18)" stroke="none" />
            <path ref={spotPathRef} fill="none" stroke="#3b82f6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <path ref={futuresPathRef} fill="none" stroke="#facc15" strokeWidth={2} vectorEffect="non-scaling-stroke" />

            {/* pulsing live-value markers — same coordinates as each path's
                last vertex, so they can never drift from the line's end */}
            <g ref={spotDotGroupRef}>
              <circle r={9} fill="#3b82f6" fillOpacity={0.4} className="animate-ping" />
              <circle r={4} fill="#3b82f6" />
            </g>

            <g ref={futuresDotGroupRef}>
              <circle r={9} fill="#facc15" fillOpacity={0.4} className="animate-ping" />
              <circle r={4} fill="#facc15" />
            </g>
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
