"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CATEGORICAL, GRIDLINE, TEXT_MUTED, SURFACE, BORDER } from "./chart-theme";

export interface IndexedPoint {
  date: string;
  aIndexed: number;
  bIndexed: number;
}

export default function PremiumChart({
  data,
  labelA,
  labelB,
}: {
  data: IndexedPoint[];
  labelA: string;
  labelB: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRIDLINE} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 10 }} minTickGap={40} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: GRIDLINE }} tickLine={false} width={44} />
        <Tooltip
          contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, fontSize: 11 }}
          labelStyle={{ color: TEXT_MUTED }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: TEXT_MUTED }} />
        <Line type="monotone" dataKey="aIndexed" name={labelA} stroke={CATEGORICAL.blue} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="bIndexed" name={labelB} stroke={CATEGORICAL.orange} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
