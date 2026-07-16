import type { EtfSymbol } from "@/lib/portfolio-builder/types";
import { TimeSeriesLineChart, type EmphasisSeries } from "./TimeSeriesLineChart";

interface GrowthChartProps {
  dates: string[];
  seriesBySymbol: Record<EtfSymbol, number[]>;
  symbols: EtfSymbol[];
  emphasis?: EmphasisSeries;
}

/** Historical growth of a $10,000 investment, indexed to a common base. */
export function GrowthChart({ dates, seriesBySymbol, symbols, emphasis }: GrowthChartProps) {
  return (
    <TimeSeriesLineChart
      dates={dates}
      seriesBySymbol={seriesBySymbol}
      symbols={symbols}
      emphasis={emphasis}
      formatValue={(value) => `$${(value / 1000).toFixed(1)}k`}
    />
  );
}
