import type { EtfSymbol } from "@/lib/portfolio-builder/types";
import { TimeSeriesLineChart, type EmphasisSeries } from "./TimeSeriesLineChart";

interface RollingVolatilityChartProps {
  dates: string[];
  seriesBySymbol: Record<EtfSymbol, Array<number | null>>;
  symbols: EtfSymbol[];
  emphasis?: EmphasisSeries;
}

/** 21-trading-day rolling annualized volatility. */
export function RollingVolatilityChart({
  dates,
  seriesBySymbol,
  symbols,
  emphasis,
}: RollingVolatilityChartProps) {
  return (
    <TimeSeriesLineChart
      dates={dates}
      seriesBySymbol={seriesBySymbol}
      symbols={symbols}
      emphasis={emphasis}
      formatValue={(value) => `${(value * 100).toFixed(0)}%`}
      yAxisWidth={44}
    />
  );
}
