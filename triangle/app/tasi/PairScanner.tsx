"use client";

import { useMemo } from "react";
import { usePairsScanner } from "@/app/components/hooks/usePairsScanner";
import type { PairsScannerResult } from "@/lib/tasi/pairs-scanner";
import { findThresholdCrossings } from "@/lib/tasi/opportunityScore";
import OpportunityTable, { type ColumnDef } from "./OpportunityTable";
import StatisticsPanel, { type StatItem } from "./StatisticsPanel";
import SignalBadge from "./SignalBadge";
import PremiumChart from "./PremiumChart";
import SpreadChart from "./SpreadChart";
import ZScoreChart from "./ZScoreChart";
import CorrelationChart from "./CorrelationChart";
import HistogramChart from "./HistogramChart";
import ScatterRegressionChart from "./ScatterRegressionChart";
import MeanReversionChart from "./MeanReversionChart";
import RecentSignalsFeed, { type SignalFeedItem } from "./RecentSignalsFeed";
import HistoricalSignalsLog from "./HistoricalSignalsLog";
import { formatNumber, formatDays } from "./format";
import { TooltipProvider } from "./InfoTooltip";
import { HEADER_TOOLTIPS } from "./tooltip-content";

type PairRow = PairsScannerResult["rows"][number];

const ROW_TINT: Record<string, string> = {
  ENTRY_LONG: "bg-emerald-400/10",
  ENTRY_SHORT: "bg-orange-400/10",
  EXTREME_DIVERGENCE: "bg-red-400/10",
  COINTEGRATION_BROKEN: "bg-red-400/5",
  WATCH: "bg-yellow-400/10",
};

const COLUMNS: ColumnDef<PairRow>[] = [
  {
    key: "pair",
    label: "Pair",
    info: HEADER_TOOLTIPS.pair,
    render: (r) => (
      <div>
        <div className="font-medium text-white">
          {r.symbolA.replace(".SR", "")}/{r.symbolB.replace(".SR", "")}
        </div>
        <div className="text-[10px] text-zinc-500">
          {r.sectorA} · {r.sectorB}
        </div>
      </div>
    ),
    sortValue: (r) => r.pairKey,
  },
  {
    key: "correlation",
    label: "Correlation",
    align: "right",
    info: HEADER_TOOLTIPS.correlation,
    render: (r) => formatNumber(r.correlation),
    sortValue: (r) => r.correlation,
  },
  {
    key: "cointegration",
    label: "Cointegration",
    align: "right",
    info: HEADER_TOOLTIPS.cointegration,
    render: (r) => (
      <span className={r.isCointegrated ? "text-emerald-400" : "text-zinc-500"}>
        p={formatNumber(r.cointegrationPValue, 3)}
      </span>
    ),
    sortValue: (r) => r.cointegrationPValue,
  },
  {
    key: "currentSpread",
    label: "Current Spread",
    align: "right",
    info: HEADER_TOOLTIPS.currentSpread,
    render: (r) => formatNumber(r.currentSpread),
    sortValue: (r) => r.currentSpread,
  },
  {
    key: "zScore",
    label: "Z-Score",
    align: "right",
    info: HEADER_TOOLTIPS.zScore,
    render: (r) => formatNumber(r.currentZScore),
    sortValue: (r) => r.currentZScore,
  },
  {
    key: "halfLife",
    label: "Half-life",
    align: "right",
    info: HEADER_TOOLTIPS.halfLife,
    render: (r) => formatDays(r.halfLifeDays),
    sortValue: (r) => r.halfLifeDays,
  },
  {
    key: "opportunityScore",
    label: "Opportunity",
    align: "right",
    info: HEADER_TOOLTIPS.opportunityScore,
    render: (r) => r.opportunityScore,
    sortValue: (r) => r.opportunityScore,
  },
  { key: "signal", label: "Signal", info: HEADER_TOOLTIPS.signal, render: (r) => <SignalBadge signal={r.signal} /> },
  { key: "updated", label: "Update Time", info: HEADER_TOOLTIPS.updated, render: () => "live" },
];

export default function PairScanner({ initialData }: { initialData: PairsScannerResult }) {
  const {
    data,
    isPending,
    error,
    refresh,
    selectedPair,
    setSelectedPair,
    detail,
    detailLoading,
    detailError,
  } = usePairsScanner(initialData);

  const selectedRow = useMemo(
    () =>
      selectedPair
        ? data.rows.find((r) => r.symbolA === selectedPair.a && r.symbolB === selectedPair.b) ?? null
        : null,
    [data.rows, selectedPair],
  );

  const recentSignals: SignalFeedItem[] = useMemo(
    () =>
      data.rows
        .filter((r) => r.signal !== "NORMAL" && r.signal !== "EXIT")
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .slice(0, 25)
        .map((r) => ({
          key: r.pairKey,
          label: `${r.symbolA.replace(".SR", "")}/${r.symbolB.replace(".SR", "")}`,
          detail: `z-score ${formatNumber(r.currentZScore)} · opportunity ${r.opportunityScore}`,
          signal: r.signal,
        })),
    [data.rows],
  );

  const crossings = useMemo(() => {
    if (!detail) return [];
    return findThresholdCrossings(detail.series.map((p) => ({ date: p.date, zScore: p.zScore })));
  }, [detail]);

  const stats: StatItem[] = selectedRow && detail
    ? [
        { label: "Correlation", value: formatNumber(selectedRow.correlation) },
        { label: "Rolling Correlation", value: formatNumber(selectedRow.rollingCorrelation) },
        { label: "Cointegration p-value", value: formatNumber(selectedRow.cointegrationPValue, 3) },
        { label: "ADF Statistic", value: formatNumber(selectedRow.adfStatistic) },
        { label: "Current Spread", value: formatNumber(selectedRow.currentSpread) },
        { label: "Average Spread", value: formatNumber(selectedRow.averageSpread) },
        { label: "Std Spread", value: formatNumber(selectedRow.stdSpread) },
        {
          label: "Current Z-Score",
          value: formatNumber(selectedRow.currentZScore),
          tone:
            selectedRow.currentZScore === null
              ? "neutral"
              : Math.abs(selectedRow.currentZScore) > 2
                ? "negative"
                : "neutral",
        },
        { label: "Expected Reversion (A)", value: formatNumber(selectedRow.expectedReversionPriceA) },
        { label: "Half-life", value: formatDays(selectedRow.halfLifeDays) },
        { label: "Sharpe Ratio", value: formatNumber(detail.sharpeRatio), sublabel: "spread-based, not backtested P&L" },
        {
          label: "Win Probability",
          value: detail.winProbability !== null ? `${(detail.winProbability * 100).toFixed(0)}%` : "—",
          sublabel: "historical reversion rate",
        },
        { label: "Signal Confidence", value: `${(detail.tradeConfidence * 100).toFixed(0)}%` },
        { label: "Hedge Ratio", value: formatNumber(selectedRow.hedgeRatio) },
      ]
    : [];

  return (
    <TooltipProvider delay={200}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white">
            Pairs Trading Scanner
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {data.universeSize} instruments · {data.pairCount} pairs · updated{" "}
            {new Date(data.updatedAt).toLocaleTimeString()}
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
        rowKey={(r) => r.pairKey}
        searchValue={(r) => `${r.symbolA} ${r.nameA} ${r.symbolB} ${r.nameB} ${r.sectorA} ${r.sectorB}`}
        onRowClick={(r) => setSelectedPair({ a: r.symbolA, b: r.symbolB })}
        selectedKey={selectedRow?.pairKey}
        updatedAt={data.updatedAt}
        defaultSortKey="opportunityScore"
        rowClassName={(r) => ROW_TINT[r.signal] ?? ""}
      />

      {detailError && <p className="text-xs text-red-400">{detailError}</p>}

      {selectedRow && (
        <div className="space-y-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {selectedRow.symbolA.replace(".SR", "")}/{selectedRow.symbolB.replace(".SR", "")}
            {detailLoading && <span className="ml-2 normal-case text-zinc-500">loading detail…</span>}
          </h3>

          <StatisticsPanel items={stats} />

          {detail && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Normalized Price Comparison">
                  <PremiumChart data={detail.series} labelA={selectedRow.symbolA.replace(".SR", "")} labelB={selectedRow.symbolB.replace(".SR", "")} />
                </ChartCard>
                <ChartCard title="Spread & Spread Mean">
                  <SpreadChart data={detail.series} dataKey="spread" label="Spread" mean={selectedRow.averageSpread} />
                </ChartCard>
                <ChartCard title="Rolling Z-Score">
                  <ZScoreChart data={detail.series} dataKey="zScore" label="Residual z-score" />
                </ChartCard>
                <ChartCard title="Rolling Correlation">
                  <CorrelationChart data={detail.series} dataKey="rollingCorrelation" label="Rolling correlation (50d)" domain={[-1, 1]} />
                </ChartCard>
                <ChartCard title="Scatter Plot with Regression Line">
                  <ScatterRegressionChart
                    points={detail.scatter}
                    line={detail.regressionLine}
                    xLabel={selectedRow.symbolB.replace(".SR", "")}
                    yLabel={selectedRow.symbolA.replace(".SR", "")}
                  />
                </ChartCard>
                <ChartCard title="Residual Distribution">
                  <HistogramChart bins={detail.residualHistogram} curve={detail.residualDistribution} />
                </ChartCard>
                <ChartCard title="Cointegration History (p-value, approx.)">
                  <CorrelationChart
                    data={detail.rollingCointegration}
                    dataKey="pValue"
                    label="p-value"
                    domain={[0, 1]}
                    referenceValue={0.1}
                    referenceLabel="0.10 threshold"
                  />
                </ChartCard>
                <ChartCard title="Mean Reversion Forecast">
                  <MeanReversionChart data={detail.meanReversionForecast} targetValue={selectedRow.averageSpread} />
                </ChartCard>
                <ChartCard title="Rolling Beta (hedge ratio)">
                  <CorrelationChart data={detail.rollingBeta} dataKey="beta" label="Hedge ratio" />
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Recent Signals (all pairs)
                  </h3>
                  <RecentSignalsFeed items={recentSignals} />
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Historical Signals — this pair
                  </h3>
                  <HistoricalSignalsLog crossings={crossings} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-[#111111] p-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h4>
      {children}
    </div>
  );
}
