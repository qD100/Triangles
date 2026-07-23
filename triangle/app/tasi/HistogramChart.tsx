"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { CATEGORICAL, GRIDLINE, TEXT_MUTED, SURFACE, BORDER } from "./chart-theme";
import type { HistogramBin } from "@/lib/tasi/statistics";

// Overlays a fitted normal-distribution curve on a count histogram. Rather
// than a second (dual) axis for density, the curve is rescaled to the same
// count scale as the bars (density * n * binWidth) — one axis, per the
// no-dual-axis rule.
export default function HistogramChart({
  bins,
  curve,
}: {
  bins: HistogramBin[];
  curve: { x: number; density: number }[];
}) {
  const n = bins.reduce((sum, b) => sum + b.count, 0);
  const binWidth = bins.length > 0 ? bins[0].binEnd - bins[0].binStart : 1;
  const scale = n * binWidth;

  const data = bins.map((bin, i) => ({
    label: ((bin.binStart + bin.binEnd) / 2).toFixed(2),
    count: bin.count,
    curve: (curve[i]?.density ?? 0) * scale,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRIDLINE} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} minTickGap={20} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: GRIDLINE }} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, fontSize: 11 }}
          labelStyle={{ color: TEXT_MUTED }}
        />
        <Bar dataKey="count" name="Frequency" fill={CATEGORICAL.blue} fillOpacity={0.55} radius={[2, 2, 0, 0]} />
        <Line type="monotone" dataKey="curve" name="Normal fit" stroke={CATEGORICAL.orange} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
