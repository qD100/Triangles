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

export default function SpreadChart<T extends { date: string }>({
  data,
  dataKey,
  label,
  mean,
}: {
  data: T[];
  dataKey: keyof T & string;
  label: string;
  mean: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRIDLINE} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 10 }} minTickGap={40} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: GRIDLINE }} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, fontSize: 11 }}
          labelStyle={{ color: TEXT_MUTED }}
        />
        <ReferenceLine y={mean} stroke={TEXT_MUTED} strokeDasharray="4 4" label={{ value: "mean", fill: TEXT_MUTED, fontSize: 10, position: "insideTopLeft" }} />
        <Line type="monotone" dataKey={dataKey} name={label} stroke={CATEGORICAL.blue} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
