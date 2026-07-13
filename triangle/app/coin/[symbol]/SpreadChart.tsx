"use client";

import { useEffect, useMemo, useState } from "react";
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

function formatPrice(value: number) {
  const maximumFractionDigits = value >= 1 ? 2 : 6;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits })}`;
}

type Point = [number, number];

// Catmull-Rom -> cubic Bezier: turns the discrete point series into a
// continuous curve through every point, instead of straight segments.
function smoothCurveCommands(points: Point[]): string {
  let commands = "";

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    commands += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }

  return commands;
}

function smoothPath(points: Point[]): string {
  return `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}${smoothCurveCommands(points)}`;
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

  const geometry = useMemo(() => {
    if (history.length < 2) return null;

    const values = history.flatMap((point) => [point.spot, point.futures]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || max * 0.001 || 1;

    const xStep = VIEW_WIDTH / (history.length - 1);

    function toY(value: number) {
      const usable = VIEW_HEIGHT - PAD_Y * 2;
      return PAD_Y + usable - ((value - min) / range) * usable;
    }

    const spotPoints: Point[] = history.map((point, index) => [index * xStep, toY(point.spot)]);
    const futuresPoints: Point[] = history.map((point, index) => [index * xStep, toY(point.futures)]);
    const reversedFuturesPoints = [...futuresPoints].reverse();

    const spotPath = smoothPath(spotPoints);
    const futuresPath = smoothPath(futuresPoints);

    const gapPath =
      spotPath +
      ` L${reversedFuturesPoints[0][0].toFixed(2)},${reversedFuturesPoints[0][1].toFixed(2)}` +
      smoothCurveCommands(reversedFuturesPoints) +
      " Z";

    return { spotPath, futuresPath, gapPath };
  }, [history]);

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
        {geometry && (
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <path d={geometry.gapPath} fill="rgba(168,85,247,0.18)" stroke="none" />
            <path d={geometry.spotPath} fill="none" stroke="#3b82f6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <path d={geometry.futuresPath} fill="none" stroke="#facc15" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </svg>
        )}

        {!geometry && !unsupported && (
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
