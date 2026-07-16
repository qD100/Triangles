"use client";

import { Fragment } from "react";

import { useColorScheme } from "@/components/portfolio-builder/hooks/useColorScheme";
import { DIVERGING_COLORS } from "@/lib/portfolio-builder/constants";
import type { EtfSymbol } from "@/lib/portfolio-builder/types";

interface CorrelationHeatmapProps {
  symbols: EtfSymbol[];
  correlationMatrix: number[][];
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Diverging blue<->red through a neutral gray midpoint at rho=0. */
function correlationColor(value: number, scheme: "light" | "dark"): string {
  const neg = DIVERGING_COLORS.negative[scheme];
  const pos = DIVERGING_COLORS.positive[scheme];
  const mid = DIVERGING_COLORS.neutral[scheme];
  return value >= 0
    ? lerpColor(mid, pos, Math.min(value, 1))
    : lerpColor(mid, neg, Math.min(-value, 1));
}

function textColorFor(value: number): string {
  return Math.abs(value) > 0.55 ? "#ffffff" : "var(--foreground)";
}

export function CorrelationHeatmap({ symbols, correlationMatrix }: CorrelationHeatmapProps) {
  const scheme = useColorScheme();

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[420px] gap-1"
        style={{ gridTemplateColumns: `56px repeat(${symbols.length}, minmax(56px, 1fr))` }}
      >
        <div />
        {symbols.map((symbol) => (
          <div
            key={symbol}
            className="pb-1 text-center text-xs font-semibold text-muted-foreground"
          >
            {symbol}
          </div>
        ))}
        {symbols.map((rowSymbol, i) => (
          <Fragment key={rowSymbol}>
            <div className="flex items-center text-xs font-semibold text-muted-foreground">
              {rowSymbol}
            </div>
            {symbols.map((colSymbol, j) => {
              const value = correlationMatrix[i][j];
              return (
                <div
                  key={`${rowSymbol}-${colSymbol}`}
                  className="flex aspect-square items-center justify-center rounded-lg text-xs font-semibold tabular-nums"
                  style={{
                    backgroundColor: correlationColor(value, scheme),
                    color: textColorFor(value),
                  }}
                  title={`${rowSymbol} vs ${colSymbol}: ${value.toFixed(2)}`}
                >
                  {value.toFixed(2)}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>-1.0</span>
        <div
          className="h-2 w-32 rounded-full"
          style={{
            background: `linear-gradient(to right, ${DIVERGING_COLORS.negative[scheme]}, ${DIVERGING_COLORS.neutral[scheme]}, ${DIVERGING_COLORS.positive[scheme]})`,
          }}
        />
        <span>+1.0</span>
      </div>
    </div>
  );
}
