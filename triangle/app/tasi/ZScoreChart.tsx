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
  ReferenceArea,
} from "recharts";
import { CATEGORICAL, GRIDLINE, TEXT_MUTED, SURFACE, BORDER } from "./chart-theme";

export default function ZScoreChart<T extends { date: string }>({
  data,
  dataKey,
  label,
}: {
  data: T[];
  dataKey: keyof T & string;
  label: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRIDLINE} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 10 }} minTickGap={40} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis
          domain={[-3.5, 3.5]}
          tick={{ fill: TEXT_MUTED, fontSize: 10 }}
          axisLine={{ stroke: GRIDLINE }}
          tickLine={false}
          width={36}
          tickFormatter={(value: number) => value.toFixed(3)}
        />
        <Tooltip
          contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, fontSize: 11 }}
          labelStyle={{ color: TEXT_MUTED }}
          formatter={(value, name) => [typeof value === "number" ? value.toFixed(3) : value, name]}
        />
        {/* recessive background bands: ±1σ / ±2σ / ±3σ, increasing shade outward */}
        <ReferenceArea y1={-1} y2={1} fill={TEXT_MUTED} fillOpacity={0.06} strokeWidth={0} />
        <ReferenceArea y1={1} y2={2} fill={TEXT_MUTED} fillOpacity={0.1} strokeWidth={0} />
        <ReferenceArea y1={-2} y2={-1} fill={TEXT_MUTED} fillOpacity={0.1} strokeWidth={0} />
        <ReferenceArea y1={2} y2={3} fill={TEXT_MUTED} fillOpacity={0.16} strokeWidth={0} />
        <ReferenceArea y1={-3} y2={-2} fill={TEXT_MUTED} fillOpacity={0.16} strokeWidth={0} />
        <ReferenceLine y={0} stroke={TEXT_MUTED} strokeDasharray="4 4" />
        <ReferenceLine y={2} stroke={CATEGORICAL.orange} strokeDasharray="2 2" strokeOpacity={0.6} label={{ value: "+2σ", fill: TEXT_MUTED, fontSize: 10, position: "insideTopRight" }} />
        <ReferenceLine y={-2} stroke={CATEGORICAL.orange} strokeDasharray="2 2" strokeOpacity={0.6} label={{ value: "-2σ", fill: TEXT_MUTED, fontSize: 10, position: "insideBottomRight" }} />
        <Line type="monotone" dataKey={dataKey} name={label} stroke={CATEGORICAL.blue} strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
