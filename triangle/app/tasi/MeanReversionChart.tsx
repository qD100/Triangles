"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { CATEGORICAL, GRIDLINE, TEXT_MUTED, SURFACE, BORDER } from "./chart-theme";

export default function MeanReversionChart({
  data,
  targetValue,
}: {
  data: { day: number; projected: number }[];
  targetValue: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRIDLINE} strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: TEXT_MUTED, fontSize: 10 }}
          axisLine={{ stroke: GRIDLINE }}
          tickLine={false}
          label={{ value: "Days ahead", fill: TEXT_MUTED, fontSize: 10, position: "insideBottom", offset: -2 }}
        />
        <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: GRIDLINE }} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, fontSize: 11 }}
          labelStyle={{ color: TEXT_MUTED }}
        />
        <ReferenceLine y={targetValue} stroke={TEXT_MUTED} strokeDasharray="4 4" label={{ value: "target", fill: TEXT_MUTED, fontSize: 10, position: "insideTopLeft" }} />
        <Line type="monotone" dataKey="projected" name="Projected" stroke={CATEGORICAL.violet} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
