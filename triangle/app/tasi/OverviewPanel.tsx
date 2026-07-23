import type { EtfScannerResult } from "@/lib/tasi/etf-scanner";
import type { PairsScannerResult } from "@/lib/tasi/pairs-scanner";
import StatisticsPanel, { type StatItem } from "./StatisticsPanel";
import SignalBadge from "./SignalBadge";
import { formatNumber } from "./format";

export default function OverviewPanel({
  etfData,
  pairsData,
}: {
  etfData: EtfScannerResult;
  pairsData: PairsScannerResult;
}) {
  const activeEtfSignals = etfData.rows.filter((r) => r.signal !== "NORMAL");
  const activePairSignals = pairsData.rows.filter((r) => r.signal !== "NORMAL" && r.signal !== "EXIT");

  const topEtf = [...etfData.rows].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];
  const topPair = [...pairsData.rows].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];

  const stats: StatItem[] = [
    { label: "ETFs Tracked", value: String(etfData.rows.length) },
    { label: "Stocks Tracked", value: String(pairsData.universeSize) },
    { label: "Pairs Monitored", value: String(pairsData.pairCount) },
    { label: "Active ETF Signals", value: String(activeEtfSignals.length) },
    { label: "Active Pair Signals", value: String(activePairSignals.length) },
  ];

  return (
    <div className="space-y-6">
      <StatisticsPanel items={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-zinc-800 bg-[#111111] p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Top ETF Opportunity
          </h3>
          {topEtf ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">
                  {topEtf.symbol} vs {topEtf.benchmarkName}
                </div>
                <div className="text-xs text-zinc-500">
                  Opportunity {topEtf.opportunityScore} · z={formatNumber(topEtf.currentZScore)}
                </div>
              </div>
              <SignalBadge signal={topEtf.signal} />
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No data.</p>
          )}
        </div>

        <div className="rounded-md border border-zinc-800 bg-[#111111] p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Top Pair Opportunity
          </h3>
          {topPair ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">
                  {topPair.symbolA.replace(".SR", "")}/{topPair.symbolB.replace(".SR", "")}
                </div>
                <div className="text-xs text-zinc-500">
                  Opportunity {topPair.opportunityScore} · z={formatNumber(topPair.currentZScore)}
                </div>
              </div>
              <SignalBadge signal={topPair.signal} />
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No data.</p>
          )}
        </div>
      </div>
    </div>
  );
}
