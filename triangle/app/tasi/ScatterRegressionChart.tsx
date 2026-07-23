"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { CATEGORICAL, GRIDLINE, TEXT_MUTED, SURFACE, BORDER } from "./chart-theme";

export default function ScatterRegressionChart({
  points,
  line,
  xLabel,
  yLabel,
}: {
  points: { x: number; y: number }[];
  line: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRIDLINE} strokeDasharray="0" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tick={{ fill: TEXT_MUTED, fontSize: 10 }}
          axisLine={{ stroke: GRIDLINE }}
          tickLine={false}
          label={{ value: xLabel, fill: TEXT_MUTED, fontSize: 10, position: "insideBottom", offset: -2 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          tick={{ fill: TEXT_MUTED, fontSize: 10 }}
          axisLine={{ stroke: GRIDLINE }}
          tickLine={false}
          width={44}
          label={{ value: yLabel, fill: TEXT_MUTED, fontSize: 10, angle: -90, position: "insideLeft" }}
        />
        <Tooltip
          contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, fontSize: 11 }}
          labelStyle={{ color: TEXT_MUTED }}
          cursor={{ strokeDasharray: "3 3" }}
        />
        <Scatter data={points} fill={CATEGORICAL.blue} fillOpacity={0.5} isAnimationActive={false} />
        <Line data={line} dataKey="y" stroke={CATEGORICAL.orange} strokeWidth={2} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
