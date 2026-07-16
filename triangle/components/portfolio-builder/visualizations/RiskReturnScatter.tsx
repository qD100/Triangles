"use client";

import {
  Cell,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { useColorScheme } from "@/components/portfolio-builder/hooks/useColorScheme";
import { ChartLegend } from "@/components/portfolio-builder/shared/ChartLegend";
import { ETF_META } from "@/lib/portfolio-builder/constants";
import type { EtfStats, EtfSymbol } from "@/lib/portfolio-builder/types";

interface RiskReturnScatterProps {
  stats: Record<EtfSymbol, EtfStats>;
  symbols: EtfSymbol[];
}

export function RiskReturnScatter({ stats, symbols }: RiskReturnScatterProps) {
  const scheme = useColorScheme();
  const data = symbols.map((symbol) => ({
    symbol,
    x: stats[symbol].annualizedVolatility * 100,
    y: stats[symbol].annualizedReturn * 100,
  }));

  return (
    <div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 24, bottom: 10, left: 0 }}>
            <XAxis
              type="number"
              dataKey="x"
              name="Annualized Volatility"
              unit="%"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Annualized Return"
              unit="%"
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
            />
            <ZAxis range={[160, 160]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value, name) => [`${Number(value).toFixed(2)}%`, String(name)]}
              labelFormatter={() => ""}
              contentStyle={{ borderRadius: 12 }}
            />
            <Scatter data={data} isAnimationActive animationDuration={700}>
              {data.map((entry) => (
                <Cell key={entry.symbol} fill={ETF_META[entry.symbol].color[scheme]} />
              ))}
              <LabelList
                dataKey="symbol"
                position="top"
                offset={10}
                style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }}
              />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={symbols.map((symbol) => ({ label: symbol, color: ETF_META[symbol].color[scheme] }))}
      />
    </div>
  );
}
