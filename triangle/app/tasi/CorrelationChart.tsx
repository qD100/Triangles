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

// Generic single-line-over-time chart — powers rolling correlation, rolling
// beta, and cointegration-p-value history, so those three don't need
// separate near-identical components.
export default function CorrelationChart<T extends { date: string }>({
  data,
  dataKey,
  label,
  domain,
  referenceValue,
  referenceLabel,
  color = CATEGORICAL.aqua,
}: {
  data: T[];
  dataKey: keyof T & string;
  label: string;
  domain?: [number, number];
  referenceValue?: number;
  referenceLabel?: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRIDLINE} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 10 }} minTickGap={40} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis domain={domain ?? ["auto", "auto"]} tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: GRIDLINE }} tickLine={false} width={44} />
        <Tooltip
          contentStyle={{ background: SURFACE, border: `1px solid ${BORDER}`, fontSize: 11 }}
          labelStyle={{ color: TEXT_MUTED }}
        />
        {referenceValue !== undefined && (
          <ReferenceLine
            y={referenceValue}
            stroke={TEXT_MUTED}
            strokeDasharray="4 4"
            label={referenceLabel ? { value: referenceLabel, fill: TEXT_MUTED, fontSize: 10, position: "insideTopRight" } : undefined}
          />
        )}
        <Line type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
