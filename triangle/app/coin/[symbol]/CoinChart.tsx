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

const KLINE_PARAMS: Record<Range, { interval: string; limit: number }> = {
  "24h": { interval: "5m", limit: 288 },
  "1w": { interval: "1h", limit: 168 },
  "1m": { interval: "4h", limit: 180 },
  "1y": { interval: "1d", limit: 365 },
  all: { interval: "1w", limit: 500 },
};

// Fetched directly from the browser, not our own server — Binance blocks
// requests from US-based cloud/datacenter IPs (where our server runs), but
// not from ordinary residential/browser IPs, same as the live ticker feeds.
async function fetchPricePoints(symbol: string, range: Range): Promise<Point[]> {
  const { interval, limit } = KLINE_PARAMS[range];

  const response = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`
  );

  if (!response.ok) return [];

  const klines: unknown[] = await response.json();

  if (!Array.isArray(klines)) return [];

  return klines.map((candle) => {
    const row = candle as [number, string, string, string, string];

    return { time: Math.floor(row[0] / 1000), value: Number(row[4]) };
  });
}

async function fetchMarketCapPoints(symbol: string, range: Range): Promise<Point[]> {
  const response = await fetch(`/api/coin/${symbol}/chart?range=${range}`);

  if (!response.ok) return [];

  const data = await response.json();

  return data.points ?? [];
}

type Props = {
  symbol: string;
};

type Point = { time: number; value: number };

export default function CoinChart({ symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const cacheRef = useRef<Map<string, Point[]>>(new Map());

  const [chartType, setChartType] = useState<ChartType>("price");
  const [range, setRange] = useState<Range>("1w");
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  // What the chart is actually showing right now — lags behind chartType/range
  // until new data lands, so the tab highlight never claims something the
  // chart hasn't caught up to yet.
  const [displayedChartType, setDisplayedChartType] = useState<ChartType>("price");
  const [displayedRange, setDisplayedRange] = useState<Range>("1w");

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
    const key = `${symbol}-${chartType}-${range}`;

    // Color/format, data, and the tab highlight must all swap together
    // atomically — never show one tab's styling against another tab's data,
    // and always reflect the user's actual selection even if it came back empty.
    function applyPoints(points: Point[]) {
      if (!seriesRef.current) return;

      setDisplayedChartType(chartType);
      setDisplayedRange(range);

      if (points.length === 0) {
        setEmpty(true);
        seriesRef.current.setData([]);
        return;
      }

      setEmpty(false);

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

      seriesRef.current.setData(
        points.map((point) => ({
          time: point.time as UTCTimestamp,
          value: point.value,
        }))
      );

      chartRef.current?.timeScale().fitContent();
    }

    const cached = cacheRef.current.get(key);

    if (cached) {
      applyPoints(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setEmpty(false);

    async function load() {
      try {
        const points =
          chartType === "price"
            ? await fetchPricePoints(symbol, range)
            : await fetchMarketCapPoints(symbol, range);

        if (cancelled) return;

        cacheRef.current.set(key, points);
        applyPoints(points);
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
              displayedChartType === "price"
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
              displayedChartType === "marketcap"
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
                displayedRange === item.value
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
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-zinc-800 bg-[#181818]/90 px-2.5 py-1 text-[10px] text-zinc-500">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
            Loading…
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
