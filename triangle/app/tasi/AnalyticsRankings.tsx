import type { PairsScannerResult } from "@/lib/tasi/pairs-scanner";
import SignalBadge from "./SignalBadge";
import { formatNumber, formatDays } from "./format";

type PairRow = PairsScannerResult["rows"][number];

function pairLabel(r: PairRow): string {
  return `${r.symbolA.replace(".SR", "")}/${r.symbolB.replace(".SR", "")}`;
}

function RankingList({
  title,
  rows,
  valueLabel,
  value,
}: {
  title: string;
  rows: PairRow[];
  valueLabel: string;
  value: (r: PairRow) => string;
}) {
  return (
    <div className="rounded-md border border-zinc-800">
      <div className="border-b border-zinc-800 bg-[#111111] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-1.5 text-left font-medium">Pair</th>
            <th className="px-3 py-1.5 text-right font-medium">{valueLabel}</th>
            <th className="px-3 py-1.5 text-right font-medium">Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-center text-zinc-500">
                Not enough data.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.pairKey} className="border-t border-zinc-800">
                <td className="px-3 py-1.5 text-white">{pairLabel(r)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-zinc-400">{value(r)}</td>
                <td className="px-3 py-1.5 text-right">
                  <SignalBadge signal={r.signal} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsRankings({ pairsData }: { pairsData: PairsScannerResult }) {
  const rows = pairsData.rows;
  const top = 10;

  const topCorrelated = [...rows]
    .filter((r) => r.correlation !== null)
    .sort((a, b) => Math.abs(b.correlation!) - Math.abs(a.correlation!))
    .slice(0, top);

  const topCointegrated = [...rows]
    .filter((r) => r.isCointegrated)
    .sort((a, b) => a.cointegrationPValue! - b.cointegrationPValue!)
    .slice(0, top);

  const largestDivergence = [...rows]
    .filter((r) => r.currentZScore !== null)
    .sort((a, b) => Math.abs(b.currentZScore!) - Math.abs(a.currentZScore!))
    .slice(0, top);

  const fastestReversion = [...rows]
    .filter((r) => r.halfLifeDays !== null)
    .sort((a, b) => a.halfLifeDays! - b.halfLifeDays!)
    .slice(0, top);

  const highestOpportunity = [...rows].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, top);

  const mostStable = [...rows]
    .filter((r) => r.stdSpread > 0)
    .sort((a, b) => a.stdSpread - b.stdSpread)
    .slice(0, top);

  const highestConfidence = [...rows].sort((a, b) => b.tradeConfidence - a.tradeConfidence).slice(0, top);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <RankingList title="Top Correlated Pairs" rows={topCorrelated} valueLabel="Correlation" value={(r) => formatNumber(r.correlation)} />
      <RankingList title="Top Cointegrated Pairs" rows={topCointegrated} valueLabel="p-value" value={(r) => formatNumber(r.cointegrationPValue, 3)} />
      <RankingList title="Largest Divergence" rows={largestDivergence} valueLabel="Z-Score" value={(r) => formatNumber(r.currentZScore)} />
      <RankingList title="Fastest Mean Reversion" rows={fastestReversion} valueLabel="Half-life" value={(r) => formatDays(r.halfLifeDays)} />
      <RankingList title="Highest Opportunity Score" rows={highestOpportunity} valueLabel="Score" value={(r) => String(r.opportunityScore)} />
      <RankingList title="Most Stable Pairs" rows={mostStable} valueLabel="Std Spread" value={(r) => formatNumber(r.stdSpread)} />
      <RankingList title="Highest Signal Confidence" rows={highestConfidence} valueLabel="Confidence" value={(r) => `${(r.tradeConfidence * 100).toFixed(0)}%`} />
    </div>
  );
}
