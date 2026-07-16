"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useColorScheme } from "@/components/portfolio-builder/hooks/useColorScheme";
import { ETF_META } from "@/lib/portfolio-builder/constants";
import type { Allocation, EtfSymbol } from "@/lib/portfolio-builder/types";

interface AllocationBarChartProps {
  allocation: Allocation;
  symbols: EtfSymbol[];
}

export function AllocationBarChart({ allocation, symbols }: AllocationBarChartProps) {
  const scheme = useColorScheme();
  const data = symbols.map((symbol) => ({ symbol, value: allocation[symbol] }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="symbol"
            width={56}
            stroke="var(--muted-foreground)"
            fontSize={13}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Allocation"]}
            contentStyle={{ borderRadius: 12 }}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive animationDuration={700}>
            {data.map((entry) => (
              <Cell key={entry.symbol} fill={ETF_META[entry.symbol].color[scheme]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
