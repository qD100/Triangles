"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

// Custom color-graded grid — Recharts has no heatmap primitive, and a
// row(instrument) x column(week) grid is naturally a colored table, not a
// forced chart type. Diverging blue<->red (the documented pair, not the
// categorical orange) since premium has a meaningful zero and two
// directions — reusing orange here would let it double as "series B"
// elsewhere and as "positive premium" here, which is confusing.
const NEGATIVE = [0x39, 0x87, 0xe5]; // blue
const NEUTRAL = [0x38, 0x38, 0x35]; // diverging midpoint gray (dark)
const POSITIVE = [0xe6, 0x67, 0x67]; // red

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function colorFor(value: number, scale: number): string {
  const t = Math.max(-1, Math.min(1, scale === 0 ? 0 : value / scale));
  const from = t < 0 ? NEGATIVE : POSITIVE;
  const absT = Math.abs(t);
  const rgb = [0, 1, 2].map((i) => lerp(NEUTRAL[i], from[i], absT));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export interface HeatmapRow {
  label: string;
  cells: { label: string; weekLabel: string; value: number }[];
}

function CellTooltip({
  rowLabel,
  weekLabel,
  value,
  children,
}: {
  rowLabel: string;
  weekLabel: string;
  value: number;
  children: React.ReactNode;
}) {
  const isRich = value > 0;
  const magnitude = Math.abs(value);
  const severity = magnitude > 1.5 ? "Large" : magnitude > 0.5 ? "Moderate" : "Small";

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={<span className="inline-flex outline-none" />}>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="top" sideOffset={8} className="z-50">
          <TooltipPrimitive.Popup className="w-[220px] origin-(--transform-origin) rounded-lg border border-zinc-800 bg-[#111111] px-3.5 py-3 text-left shadow-2xl shadow-black/60 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:slide-in-from-bottom-1 data-[state=delayed-open]:duration-150 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-1 data-closed:duration-100">
            <div className="text-xs font-bold text-white">
              {rowLabel} <span className="font-normal text-zinc-500">· {weekLabel}</span>
            </div>
            <div
              className="mt-1.5 font-mono text-base font-bold"
              style={{ color: isRich ? "#ec8585" : "#6ba7ea" }}
            >
              {value >= 0 ? "+" : ""}
              {value.toFixed(2)} pts
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              {severity} {isRich ? "premium" : "discount"} — traded {isRich ? "above" : "below"} NAV this week on average.
            </div>
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export default function HeatmapGrid({ rows, scale }: { rows: HeatmapRow[]; scale: number }) {
  if (rows.length === 0) return null;
  const columnLabels = rows[0].cells.map((c) => c.label);

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-[#111111] px-2 py-1 text-left text-zinc-500">
              &nbsp;
            </th>
            {columnLabels.map((label, i) => (
              <th key={i} className="px-1 py-1 text-center font-normal text-zinc-500">
                {i % 4 === 0 ? label : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="sticky left-0 whitespace-nowrap bg-[#111111] px-2 py-1 text-zinc-400">
                {row.label}
              </td>
              {row.cells.map((cell, i) => (
                <td key={i} className="p-0">
                  <CellTooltip rowLabel={row.label} weekLabel={cell.weekLabel} value={cell.value}>
                    <div
                      className="h-5 w-5 cursor-default transition-[outline] outline outline-1 -outline-offset-1 outline-transparent hover:outline-white/40"
                      style={{ backgroundColor: colorFor(cell.value, scale) }}
                    />
                  </CellTooltip>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
