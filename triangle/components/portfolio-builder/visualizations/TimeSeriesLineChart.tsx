"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useColorScheme } from "@/components/portfolio-builder/hooks/useColorScheme";
import { ETF_META } from "@/lib/portfolio-builder/constants";
import { downsampleSeries } from "@/lib/portfolio-builder/downsample";
import type { EtfSymbol } from "@/lib/portfolio-builder/types";

export interface EmphasisSeries {
  label: string;
  values: Array<number | null>;
  color: string;
}

interface TimeSeriesLineChartProps {
  dates: string[];
  seriesBySymbol: Record<EtfSymbol, Array<number | null>>;
  symbols: EtfSymbol[];
  emphasis?: EmphasisSeries;
  formatValue: (value: number) => string;
  yAxisWidth?: number;
}

const MAX_CHART_POINTS = 260;

export function TimeSeriesLineChart({
  dates,
  seriesBySymbol,
  symbols,
  emphasis,
  formatValue,
  yAxisWidth = 56,
}: TimeSeriesLineChartProps) {
  const scheme = useColorScheme();

  const data = useMemo(() => {
    const indices = downsampleSeries(
      dates.map((_, i) => i),
      MAX_CHART_POINTS
    );
    return indices.map((i) => {
      const point: Record<string, number | string | null> = { date: dates[i] };
      for (const symbol of symbols) point[symbol] = seriesBySymbol[symbol][i];
      if (emphasis) point.portfolio = emphasis.values[i];
      return point;
    });
  }, [dates, seriesBySymbol, symbols, emphasis]);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => value.slice(0, 7)}
            minTickGap={48}
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value: number) => formatValue(value)}
            stroke="var(--muted-foreground)"
            fontSize={12}
            width={yAxisWidth}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [
              formatValue(Number(value)),
              name === "portfolio" ? emphasis?.label ?? "Portfolio" : String(name),
            ]}
            contentStyle={{ borderRadius: 12 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) =>
              value === "portfolio" ? emphasis?.label ?? "Portfolio" : value
            }
          />
          {symbols.map((symbol) => (
            <Line
              key={symbol}
              type="monotone"
              dataKey={symbol}
              stroke={emphasis ? "var(--muted-foreground)" : ETF_META[symbol].color[scheme]}
              strokeOpacity={emphasis ? 0.35 : 1}
              strokeWidth={emphasis ? 1.5 : 2}
              dot={false}
              isAnimationActive
              animationDuration={800}
            />
          ))}
          {emphasis && (
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke={emphasis.color}
              strokeWidth={3}
              dot={false}
              isAnimationActive
              animationDuration={800}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
