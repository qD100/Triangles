"use client";

import { BadgeCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/portfolio-builder/shared/GlassCard";
import { CorrelationHeatmap } from "@/components/portfolio-builder/visualizations/CorrelationHeatmap";
import { GrowthChart } from "@/components/portfolio-builder/visualizations/GrowthChart";
import { RiskReturnScatter } from "@/components/portfolio-builder/visualizations/RiskReturnScatter";
import { RollingVolatilityChart } from "@/components/portfolio-builder/visualizations/RollingVolatilityChart";
import type { AnalyticsBundle } from "@/lib/portfolio-builder/types";
import { EtfMetricsCard } from "./EtfMetricsCard";
import { RiskFreeRateControl } from "./RiskFreeRateControl";

interface AnalyticsDashboardProps {
  analytics: AnalyticsBundle;
  riskFreeRate: number;
  onRiskFreeRateChange: (value: number) => void;
  onContinue: () => void;
}

export function AnalyticsDashboard({
  analytics,
  riskFreeRate,
  onRiskFreeRateChange,
  onContinue,
}: AnalyticsDashboardProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Six years of market data, distilled
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          {analytics.dataStartDate} to {analytics.dataEndDate} · daily adjusted closing prices
          for SPY, VXUS, SGOV, GLD &amp; VNQ
        </p>
      </div>

      <Alert>
        <BadgeCheck />
        <AlertTitle>Total-return data</AlertTitle>
        <AlertDescription>
          Figures use each fund&apos;s dividend-and-split-adjusted close, so reinvested dividends and
          distributions are included — not just price appreciation. This matters most for SGOV,
          whose return comes almost entirely from its yield rather than share-price movement.
        </AlertDescription>
      </Alert>

      <GlassCard className="p-5">
        <RiskFreeRateControl value={riskFreeRate} onChange={onRiskFreeRateChange} />
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {analytics.symbols.map((symbol) => (
          <EtfMetricsCard
            key={symbol}
            symbol={symbol}
            stats={analytics.stats[symbol]}
            riskFreeRate={riskFreeRate}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-4 font-semibold">Growth of $10,000</h3>
          <GrowthChart
            dates={analytics.dates}
            seriesBySymbol={analytics.growth10k}
            symbols={analytics.symbols}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-4 font-semibold">Rolling 21-Day Volatility</h3>
          {/* Rolling vol is derived from daily returns, which is one entry shorter than `dates` (no return exists for the first price). */}
          <RollingVolatilityChart
            dates={analytics.dates.slice(1)}
            seriesBySymbol={analytics.rollingVolatility}
            symbols={analytics.symbols}
          />
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-4 font-semibold">Risk vs. Return</h3>
          <RiskReturnScatter stats={analytics.stats} symbols={analytics.symbols} />
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-4 font-semibold">Correlation Matrix</h3>
          <CorrelationHeatmap
            symbols={analytics.symbols}
            correlationMatrix={analytics.correlationMatrix}
          />
        </GlassCard>
      </div>

      <div className="flex justify-center pt-2">
        <Button
          size="lg"
          onClick={onContinue}
          className="bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 text-white hover:opacity-90"
        >
          See my recommended portfolio
        </Button>
      </div>
    </div>
  );
}
