"use client";

import { useMemo } from "react";

import { useColorScheme } from "@/components/portfolio-builder/hooks/useColorScheme";
import { GlassCard } from "@/components/portfolio-builder/shared/GlassCard";
import { StatCard } from "@/components/portfolio-builder/shared/StatCard";
import { AllocationBarChart } from "@/components/portfolio-builder/visualizations/AllocationBarChart";
import { AllocationDonutChart } from "@/components/portfolio-builder/visualizations/AllocationDonutChart";
import { GrowthChart } from "@/components/portfolio-builder/visualizations/GrowthChart";
import { RollingVolatilityChart } from "@/components/portfolio-builder/visualizations/RollingVolatilityChart";
import { buildAllocation } from "@/lib/portfolio-builder/allocation";
import { ETF_META, ROLLING_VOL_WINDOW_DAYS } from "@/lib/portfolio-builder/constants";
import { diversificationScore } from "@/lib/portfolio-builder/diversification";
import {
  annualizedReturn,
  growthOfInvestment,
  maxDrawdown,
  portfolioDailyReturns,
  portfolioVolatility,
  rollingVolatility,
} from "@/lib/portfolio-builder/finance";
import type {
  AnalyticsBundle,
  Answers,
  EtfSymbol,
  RiskScoreResult,
} from "@/lib/portfolio-builder/types";
import { ConfettiBurst } from "./ConfettiBurst";
import { ExportControls } from "./ExportControls";
import { StyleBadge } from "./StyleBadge";

interface RecommendationDashboardProps {
  analytics: AnalyticsBundle;
  answers: Answers;
  riskScore: RiskScoreResult;
  onRestart: () => void;
}

const PORTFOLIO_ACCENT_COLOR = "#7c3aed";

export function RecommendationDashboard({
  analytics,
  riskScore,
  onRestart,
}: RecommendationDashboardProps) {
  const scheme = useColorScheme();

  const volBySymbol = useMemo(() => {
    const result = {} as Record<EtfSymbol, number>;
    for (const symbol of analytics.symbols) {
      result[symbol] = analytics.stats[symbol].annualizedVolatility;
    }
    return result;
  }, [analytics]);

  const { baseline, final } = useMemo(
    () => buildAllocation(riskScore.score, volBySymbol),
    [riskScore.score, volBySymbol]
  );

  const portfolioReturns = useMemo(
    () => portfolioDailyReturns(final, analytics.dailyReturns, analytics.symbols),
    [final, analytics]
  );
  const portfolioGrowth = useMemo(
    () => growthOfInvestment(portfolioReturns),
    [portfolioReturns]
  );
  const portfolioRollingVol = useMemo(
    () => rollingVolatility(portfolioReturns, ROLLING_VOL_WINDOW_DAYS),
    [portfolioReturns]
  );

  const metrics = useMemo(
    () => ({
      expectedVolatility: portfolioVolatility(
        final,
        analytics.covarianceMatrix,
        analytics.symbols
      ),
      historicalCagr: annualizedReturn(portfolioGrowth, analytics.dates),
      worstDrawdown: maxDrawdown(portfolioGrowth),
      diversificationScore: diversificationScore(
        final,
        analytics.symbols,
        analytics.correlationMatrix
      ),
      growth10k: portfolioGrowth,
    }),
    [final, analytics, portfolioGrowth]
  );

  return (
    <div className="space-y-8">
      <ConfettiBurst />

      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Your recommendation
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Your {riskScore.label} Portfolio
        </h2>
        <div className="mt-4 flex justify-center">
          <StyleBadge label={riskScore.label} score={riskScore.score} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Risk Score" value={`${riskScore.score}/100`} />
        <StatCard label="Investment Style" value={riskScore.label} />
        <StatCard
          label="Expected Volatility"
          value={`${(metrics.expectedVolatility * 100).toFixed(1)}%`}
          tooltip="Annualized standard deviation of this portfolio's historical returns."
        />
        <StatCard
          label="Historical CAGR"
          value={`${(metrics.historicalCagr * 100).toFixed(1)}%`}
          tooltip="Annualized growth rate this allocation would have achieved over 2020-2025 (price return only)."
        />
        <StatCard
          label="Worst Drawdown"
          value={`${(metrics.worstDrawdown * 100).toFixed(1)}%`}
          tooltip="Largest peak-to-trough decline this allocation experienced historically."
        />
        <StatCard
          label="Diversification"
          value={`${metrics.diversificationScore.toFixed(0)}/100`}
          tooltip="Higher means the assets in this portfolio move less in lockstep with each other."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-2 font-semibold">Recommended Allocation</h3>
          <AllocationDonutChart allocation={final} symbols={analytics.symbols} />
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-2 font-semibold">Allocation Breakdown</h3>
          <AllocationBarChart allocation={final} symbols={analytics.symbols} />
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <h3 className="mb-1 font-semibold">Risk profile baseline vs. final allocation</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Your risk score sets a starting point; historical volatility then nudges it so
          lower-volatility assets get a slightly larger share.
        </p>
        <div className="space-y-2.5">
          {analytics.symbols.map((symbol) => (
            <div key={symbol} className="flex items-center gap-3 text-sm">
              <span className="w-14 shrink-0 font-semibold">{symbol}</span>
              <span className="hidden w-24 shrink-0 text-xs text-muted-foreground sm:block">
                baseline {baseline[symbol].toFixed(1)}%
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${final[symbol]}%`,
                    backgroundColor: ETF_META[symbol].color[scheme],
                  }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-semibold tabular-nums">
                {final[symbol].toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-4 font-semibold">Growth of $10,000</h3>
          <GrowthChart
            dates={analytics.dates}
            seriesBySymbol={analytics.growth10k}
            symbols={analytics.symbols}
            emphasis={{
              label: "Your Portfolio",
              values: portfolioGrowth,
              color: PORTFOLIO_ACCENT_COLOR,
            }}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-4 font-semibold">Rolling 21-Day Volatility</h3>
          <RollingVolatilityChart
            dates={analytics.dates.slice(1)}
            seriesBySymbol={analytics.rollingVolatility}
            symbols={analytics.symbols}
            emphasis={{
              label: "Your Portfolio",
              values: portfolioRollingVol,
              color: PORTFOLIO_ACCENT_COLOR,
            }}
          />
        </GlassCard>
      </div>

      <ExportControls
        symbols={analytics.symbols}
        allocation={final}
        riskScore={riskScore}
        metrics={metrics}
        onRestart={onRestart}
      />
    </div>
  );
}
