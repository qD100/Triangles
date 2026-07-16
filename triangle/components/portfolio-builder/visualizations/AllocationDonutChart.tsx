"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useColorScheme } from "@/components/portfolio-builder/hooks/useColorScheme";
import { ChartLegend } from "@/components/portfolio-builder/shared/ChartLegend";
import { ETF_META } from "@/lib/portfolio-builder/constants";
import type { Allocation, EtfSymbol } from "@/lib/portfolio-builder/types";

interface AllocationDonutChartProps {
  allocation: Allocation;
  symbols: EtfSymbol[];
}

export function AllocationDonutChart({ allocation, symbols }: AllocationDonutChartProps) {
  const scheme = useColorScheme();
  const data = symbols.map((symbol) => ({
    symbol,
    name: ETF_META[symbol].fullName,
    value: allocation[symbol],
  }));

  return (
    <div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="symbol"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              cornerRadius={6}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.symbol}
                  fill={ETF_META[entry.symbol].color[scheme]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [
                `${Number(value).toFixed(1)}%`,
                String(item.payload?.symbol ?? ""),
              ]}
              contentStyle={{ borderRadius: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={data.map((entry) => ({
          label: `${entry.symbol} · ${entry.value.toFixed(1)}%`,
          color: ETF_META[entry.symbol].color[scheme],
        }))}
      />
    </div>
  );
}
