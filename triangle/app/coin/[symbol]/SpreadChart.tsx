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
const PAD_Y = 24;

// Rolling window the chart displays, driven by wall-clock time rather than
// point count — this is what makes it scroll continuously instead of
// snapping every time a new sample lands.
const WINDOW_MS = 2 * 60 * 1000;

type Point = [number, number];

function formatPrice(value: number) {
  const maximumFractionDigits = value >= 1 ? 2 : 6;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits })}`;
}

function buildPath(points: Point[]) {
  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
}

export default function SpreadChart({ symbol, connected, current, history }: Props) {
  // If we've been connected a few seconds and never once seen this symbol
  // in a broadcast, it isn't a pair the spot/futures engine tracks (no
  // futures market, or just not in the watched pair list). Reset happens
  // during render (state-adjustment-on-prop-change pattern) so switching
  // to a new symbol clears the flag immediately instead of via an effect.
  const [unsupported, setUnsupported] = useState(false);
  const [trackedSymbol, setTrackedSymbol] = useState(symbol);

  if (symbol !== trackedSymbol) {
    setTrackedSymbol(symbol);
    setUnsupported(false);
  }

  useEffect(() => {
    if (!connected || current) return;

    const timer = setTimeout(() => setUnsupported(true), 4000);

    return () => clearTimeout(timer);
  }, [connected, current, symbol]);

  const historyRef = useRef<SpreadPoint[]>(history);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const spotPathRef = useRef<SVGPathElement>(null);
  const futuresPathRef = useRef<SVGPathElement>(null);
  const gapPathRef = useRef<SVGPathElement>(null);

  const [hasGeometry, setHasGeometry] = useState(false);

  // Redraws every animation frame using the current wall-clock time, so the
  // line continuously scrolls left in real time instead of jumping once a
  // second when a new websocket sample arrives.
  useEffect(() => {
    let frame: number;

    function draw() {
      frame = requestAnimationFrame(draw);

      const now = Date.now();
      const windowStart = now - WINDOW_MS;
      const points = historyRef.current.filter((point) => point.time >= windowStart);

      if (points.length < 2) {
        setHasGeometry((prev) => (prev ? false : prev));
        return;
      }

      setHasGeometry((prev) => (prev ? prev : true));

      const values = points.flatMap((point) => [point.spot, point.futures]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || max * 0.001 || 1;
      const usable = VIEW_HEIGHT - PAD_Y * 2;

      function toXY(time: number, value: number): Point {
        const x = ((time - windowStart) / WINDOW_MS) * VIEW_WIDTH;
        const y = PAD_Y + usable - ((value - min) / range) * usable;
        return [x, y];
      }

      const spotPoints = points.map((point) => toXY(point.time, point.spot));
      const futuresPoints = points.map((point) => toXY(point.time, point.futures));

      const gapPath =
        buildPath(spotPoints) +
        " " +
        [...futuresPoints].reverse().map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(" ") +
        " Z";

      spotPathRef.current?.setAttribute("d", buildPath(spotPoints));
      futuresPathRef.current?.setAttribute("d", buildPath(futuresPoints));
      gapPathRef.current?.setAttribute("d", gapPath);
    }

    frame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frame);
  }, []);

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
          className={`h-full w-full transition-opacity duration-300 ${hasGeometry ? "opacity-100" : "opacity-0"}`}
        >
          <path ref={gapPathRef} fill="rgba(168,85,247,0.18)" stroke="none" />
          <path ref={spotPathRef} fill="none" stroke="#3b82f6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <path ref={futuresPathRef} fill="none" stroke="#facc15" strokeWidth={2} vectorEffect="non-scaling-stroke" />
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
