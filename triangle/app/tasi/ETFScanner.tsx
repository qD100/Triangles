"use client";

import { useMemo } from "react";
import { useETFScanner } from "@/app/components/hooks/useETFScanner";
import type { EtfScannerResult } from "@/lib/tasi/etf-scanner";
import { findThresholdCrossings } from "@/lib/tasi/opportunityScore";
import OpportunityTable, { type ColumnDef } from "./OpportunityTable";
import StatisticsPanel, { type StatItem } from "./StatisticsPanel";
import SignalBadge from "./SignalBadge";
import PremiumChart from "./PremiumChart";
import SpreadChart from "./SpreadChart";
import ZScoreChart from "./ZScoreChart";
import HistogramChart from "./HistogramChart";
import HeatmapGrid from "./HeatmapGrid";
import MeanReversionChart from "./MeanReversionChart";
import RecentSignalsFeed, { type SignalFeedItem } from "./RecentSignalsFeed";
import HistoricalSignalsLog from "./HistoricalSignalsLog";
import { formatPercent, formatPrice, formatNumber, formatDays } from "./format";
import { InfoTooltip, TooltipProvider } from "./InfoTooltip";
import { STAT_TOOLTIPS, CHART_TOOLTIPS, HEADER_TOOLTIPS, type TooltipContent } from "./tooltip-content";

type EtfRow = EtfScannerResult["rows"][number];

const COLUMNS: ColumnDef<EtfRow>[] = [
  {
    key: "symbol",
    label: "ETF",
    render: (r) => (
      <div>
        <div className="font-medium text-white">{r.symbol}</div>
        <div className="text-[10px] text-zinc-500">{r.name}</div>
      </div>
    ),
    sortValue: (r) => r.symbol,
  },
  { key: "benchmark", label: "Benchmark", render: (r) => r.benchmarkName, sortValue: (r) => r.benchmarkName },
  {
    key: "price",
    label: "ETF Price",
    align: "right",
    render: (r) => formatPrice(r.etfPrice, r.currency),
    sortValue: (r) => r.etfPrice,
  },
  {
    key: "nav",
    label: "NAV",
    align: "right",
    render: (r) => (r.hasLiveNav ? formatPrice(r.nav, r.currency) : "—"),
    sortValue: (r) => r.nav,
  },
  {
    key: "premiumPct",
    label: "Premium %",
    align: "right",
    render: (r) => (r.hasLiveNav ? formatPercent(r.premiumPct) : "—"),
    sortValue: (r) => r.premiumPct,
  },
  {
    key: "zScore",
    label: "Z-Score",
    align: "right",
    render: (r) => formatNumber(r.currentZScore),
    sortValue: (r) => r.currentZScore,
  },
  {
    key: "opportunityScore",
    label: "Opportunity",
    align: "right",
    render: (r) => r.opportunityScore,
    sortValue: (r) => r.opportunityScore,
  },
  { key: "signal", label: "Signal", render: (r) => <SignalBadge signal={r.signal} /> },
  {
    key: "updatedAt",
    label: "Updated",
    render: (r) => (r.isSimulated ? "simulated" : "live"),
  },
];

export default function ETFScanner({ initialData }: { initialData: EtfScannerResult }) {
  const { data, isPending, error, refresh, selectedSymbol, setSelectedSymbol, selectedRow } =
    useETFScanner(initialData);

  const recentSignals: SignalFeedItem[] = useMemo(
    () =>
      data.rows
        .filter((r) => r.signal !== "NORMAL")
        .map((r) => ({
          key: r.symbol,
          label: `${r.symbol} vs ${r.benchmarkName}`,
          detail: `z-score ${formatNumber(r.currentZScore)} · opportunity ${r.opportunityScore}`,
          signal: r.signal,
        })),
    [data.rows],
  );

  const crossings = useMemo(() => {
    if (!selectedRow) return [];
    return findThresholdCrossings(
      selectedRow.series.map((p) => ({ date: p.date, zScore: p.zScore20 })),
    );
  }, [selectedRow]);

  const stats: StatItem[] = selectedRow
    ? [
        { label: "Current Premium", value: `${selectedRow.currentTrackingPremium?.toFixed(2) ?? "—"} pts`, info: STAT_TOOLTIPS.currentPremium },
        { label: "Average Premium", value: `${selectedRow.historicalMeanPremium.toFixed(2)} pts`, info: STAT_TOOLTIPS.averagePremium },
        {
          label: "Volatility (σ)",
          value: selectedRow.historicalStdPremium.toFixed(2),
          info: STAT_TOOLTIPS.volatility,
        },
        { label: "Half-life", value: formatDays(selectedRow.halfLifeDays), info: HEADER_TOOLTIPS.halfLife },
        {
          label: "Opportunity Score",
          value: String(selectedRow.opportunityScore),
          tone: selectedRow.opportunityScore >= 60 ? "positive" : "neutral",
          info: STAT_TOOLTIPS.opportunityScore,
        },
        {
          label: "Signal Confidence",
          value: `${(selectedRow.signalConfidence * 100).toFixed(0)}%`,
          info: STAT_TOOLTIPS.signalConfidence,
        },
        { label: "Days Above 2σ", value: String(selectedRow.daysAbove2Sigma), info: STAT_TOOLTIPS.daysAbove2Sigma },
        { label: "Days Below -2σ", value: String(selectedRow.daysBelow2Sigma), info: STAT_TOOLTIPS.daysBelow2Sigma },
        {
          label: "Fair Value",
          value: selectedRow.fairValue !== null ? formatPrice(selectedRow.fairValue, selectedRow.currency) : "—",
          info: STAT_TOOLTIPS.fairValue,
        },
        {
          label: "Deviation",
          value: formatPercent(selectedRow.deviationFromFairValuePct),
          tone:
            selectedRow.deviationFromFairValuePct === null
              ? "neutral"
              : selectedRow.deviationFromFairValuePct > 0
                ? "positive"
                : "negative",
          info: STAT_TOOLTIPS.deviation,
        },
      ]
    : [];

  const heatmapRows = data.rows.map((r) => ({
    label: r.symbol,
    cells: r.weeklyHeatmap.map((w) => ({
      label: w.weekLabel.split("-W")[1] ?? w.weekLabel,
      weekLabel: w.weekLabel,
      value: w.value,
    })),
  }));
  const heatmapScale =
    Math.max(1, ...data.rows.map((r) => r.historicalStdPremium * 2.5)) || 1;

  return (
    <TooltipProvider delay={200}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white">
            ETF vs Index Arbitrage Scanner
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Live from Yahoo Finance · updated {new Date(data.updatedAt).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isPending}
          className="rounded border border-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-[#181818] disabled:opacity-50"
        >
          {isPending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {data.warnings.length > 0 && (
        <ul className="space-y-1 rounded border border-zinc-800 bg-[#111111] px-3 py-2 text-xs text-yellow-400">
          {data.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <OpportunityTable
        columns={COLUMNS}
        rows={data.rows}
        rowKey={(r) => r.symbol}
        searchValue={(r) => `${r.symbol} ${r.name}`}
        onRowClick={(r) => setSelectedSymbol(r.symbol)}
        selectedKey={selectedSymbol}
        updatedAt={data.updatedAt}
        defaultSortKey="opportunityScore"
      />

      {selectedRow && (
        <div className="space-y-6">
          <StatisticsPanel items={stats} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Premium / Discount Time Series" info={CHART_TOOLTIPS.premiumTimeSeries}>
              <SpreadChart
                data={selectedRow.series}
                dataKey="premium"
                label="Tracking premium"
                mean={selectedRow.historicalMeanPremium}
              />
            </ChartCard>
            <ChartCard title="Rolling Z-Score (20/50/100)" info={CHART_TOOLTIPS.rollingZScore}>
              <ZScoreChart data={selectedRow.series} dataKey="zScore20" label="Z-score (20d)" />
            </ChartCard>
            <ChartCard title="Deviation Histogram & Distribution Curve" info={CHART_TOOLTIPS.deviationHistogram}>
              <HistogramChart bins={selectedRow.histogramBins} curve={selectedRow.distributionCurve} />
            </ChartCard>
            <ChartCard title="Mean Reversion Projection" info={CHART_TOOLTIPS.meanReversionProjection}>
              <MeanReversionChart
                data={selectedRow.meanReversionForecast}
                targetValue={selectedRow.historicalMeanPremium}
              />
            </ChartCard>
            <ChartCard title="Normalized Price Comparison (context)" info={CHART_TOOLTIPS.normalizedPriceComparison}>
              <PremiumChart
                data={selectedRow.series.map((p) => ({
                  date: p.date,
                  aIndexed: p.etfIndexed,
                  bIndexed: p.benchmarkIndexed,
                }))}
                labelA={selectedRow.symbol}
                labelB={selectedRow.benchmarkName}
              />
            </ChartCard>
            <ChartCard title="Premium Heatmap (weekly avg, all ETFs)" info={CHART_TOOLTIPS.premiumHeatmap}>
              <HeatmapGrid rows={heatmapRows} scale={heatmapScale} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Recent Signals
              </h3>
              <RecentSignalsFeed items={recentSignals} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Historical Signals — {selectedRow.symbol}
              </h3>
              <HistoricalSignalsLog crossings={crossings} />
            </div>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}

function ChartCard({
  title,
  info,
  children,
}: {
  title: string;
  info?: TooltipContent;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-[#111111] p-3">
      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        <span>{title}</span>
        {info && (
          <InfoTooltip content={info}>
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] leading-none normal-case tracking-normal text-zinc-600 hover:text-zinc-300">
              ⓘ
            </span>
          </InfoTooltip>
        )}
      </h4>
      {children}
    </div>
  );
}
