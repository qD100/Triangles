"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";

import { useColorScheme } from "@/components/portfolio-builder/hooks/useColorScheme";
import { GlassCard } from "@/components/portfolio-builder/shared/GlassCard";
import { ETF_META, STATUS_COLORS } from "@/lib/portfolio-builder/constants";
import { sharpeRatio } from "@/lib/portfolio-builder/finance";
import type { EtfStats, EtfSymbol, RiskTier } from "@/lib/portfolio-builder/types";

interface EtfMetricsCardProps {
  symbol: EtfSymbol;
  stats: EtfStats;
  riskFreeRate: number;
}

const TIER_CONFIG: Record<RiskTier, { label: string; icon: typeof CheckCircle2 }> = {
  good: { label: "Low risk", icon: CheckCircle2 },
  warning: { label: "Moderate risk", icon: AlertTriangle },
  critical: { label: "High risk", icon: AlertOctagon },
};

function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function EtfMetricsCard({ symbol, stats, riskFreeRate }: EtfMetricsCardProps) {
  const scheme = useColorScheme();
  const meta = ETF_META[symbol];
  const tier = TIER_CONFIG[stats.riskTier];
  const TierIcon = tier.icon;
  // Recomputed client-side so the risk-free-rate slider updates instantly.
  const sharpe = sharpeRatio(stats.annualizedReturn, stats.annualizedVolatility, riskFreeRate);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: meta.color[scheme] }} />
          <div>
            <div className="font-semibold">{symbol}</div>
            <div className="text-xs text-muted-foreground">{meta.fullName}</div>
          </div>
        </div>
        <div
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            color: STATUS_COLORS[stats.riskTier],
            backgroundColor: `${STATUS_COLORS[stats.riskTier]}1a`,
          }}
        >
          <TierIcon className="size-3.5" />
          {tier.label}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
        <Metric label="Annualized Return" value={formatPercent(stats.annualizedReturn)} />
        <Metric label="Sharpe Ratio" value={sharpe.toFixed(2)} />
        <Metric label="Daily Volatility" value={formatPercent(stats.dailyVolatility)} />
        <Metric label="Annualized Volatility" value={formatPercent(stats.annualizedVolatility)} />
        <Metric label="Max Drawdown" value={formatPercent(stats.maxDrawdown)} />
      </dl>
    </GlassCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
