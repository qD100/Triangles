"use client";

import { useEffect, useState } from "react";
import { generateWalk, stepWalk } from "./randomWalk";

const WIDTH = 300;
const HEIGHT = 80;
const POINTS = 28;

function buildPath(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * WIDTH;
    const y = HEIGHT - ((v - min) / range) * (HEIGHT - 10) - 5;
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;
  const last = coords[coords.length - 1];

  return { line, area, last };
}

export default function Sparkline({
  seed,
  colorHex,
  gradientId,
}: {
  seed: number;
  colorHex: string;
  gradientId: string;
}) {
  const [values, setValues] = useState(() => generateWalk(seed, POINTS));

  useEffect(() => {
    const id = setInterval(() => {
      setValues((prev) => stepWalk(prev, 5));
    }, 2200);

    return () => clearInterval(id);
  }, []);

  const { line, area, last } = buildPath(values);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-16 w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorHex} stopOpacity={0.35} />
          <stop offset="100%" stopColor={colorHex} stopOpacity={0} />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={colorHex} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />

      {last && (
        <g>
          <circle cx={last[0]} cy={last[1]} r={7} fill={colorHex} opacity={0.18}>
            <animate attributeName="r" values="5;9;5" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.28;0.05;0.28" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={last[0]} cy={last[1]} r={2.75} fill={colorHex} />
        </g>
      )}
    </svg>
  );
}
