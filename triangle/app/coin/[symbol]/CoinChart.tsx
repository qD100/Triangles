"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

type ChartType = "price" | "marketcap";
type Range = "24h" | "1w" | "1m" | "1y" | "all";

function formatCompactUsd(value: number) {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;

  return `$${value.toFixed(2)}`;
}

const RANGES: { value: Range; label: string }[] = [
  { value: "24h", label: "24H" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

type Props = {
  symbol: string;
};

export default function CoinChart({ symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const [chartType, setChartType] = useState<ChartType>("price");
  const [range, setRange] = useState<Range>("1w");
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#111111" },
        textColor: "#71717a",
      },
      grid: {
        vertLines: { color: "#1f1f23" },
        horzLines: { color: "#1f1f23" },
      },
      rightPriceScale: { borderColor: "#27272a" },
      timeScale: { borderColor: "#27272a", timeVisible: true },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#3b82f6",
      topColor: "rgba(59,130,246,0.35)",
      bottomColor: "rgba(59,130,246,0.02)",
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setEmpty(false);

      try {
        const response = await fetch(
          `/api/coin/${symbol}/chart?type=${chartType}&range=${range}`
        );
        const data = await response.json();
        const points: { time: number; value: number }[] = data.points ?? [];

        if (cancelled || !seriesRef.current) return;

        if (points.length === 0) {
          setEmpty(true);
        } else {
          seriesRef.current.setData(
            points.map((point) => ({
              time: point.time as UTCTimestamp,
              value: point.value,
            }))
          );

          seriesRef.current.applyOptions({
            lineColor: chartType === "price" ? "#3b82f6" : "#facc15",
            topColor:
              chartType === "price"
                ? "rgba(59,130,246,0.35)"
                : "rgba(250,204,21,0.35)",
            bottomColor:
              chartType === "price"
                ? "rgba(59,130,246,0.02)"
                : "rgba(250,204,21,0.02)",
            priceFormat:
              chartType === "marketcap"
                ? { type: "custom", formatter: formatCompactUsd, minMove: 1 }
                : { type: "price", precision: 2, minMove: 0.01 },
          });

          chartRef.current?.timeScale().fitContent();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [symbol, chartType, range]);

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-[#181818] p-1">
          <button
            type="button"
            onClick={() => setChartType("price")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              chartType === "price"
                ? "bg-blue-500/20 text-blue-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Price
          </button>

          <button
            type="button"
            onClick={() => setChartType("marketcap")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              chartType === "marketcap"
                ? "bg-yellow-400/20 text-yellow-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Market Cap
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-[#181818] p-1">
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRange(item.value)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                range === item.value
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[380px] w-full sm:h-[460px]">
        <div ref={containerRef} className="h-full w-full" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111111]/60 text-sm text-zinc-500">
            Loading chart…
          </div>
        )}

        {!loading && empty && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
            No chart data available for this range.
          </div>
        )}
      </div>
    </section>
  );
}
