"use client";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/portfolio-builder/shared/GlassCard";
import { StatCard } from "@/components/portfolio-builder/shared/StatCard";
import { StyleBadge } from "@/components/portfolio-builder/recommendation/StyleBadge";
import { SUPER_CATEGORY_LABELS } from "@/lib/portfolio-builder/constants";
import type { ClientRecord } from "@/lib/portfolio-builder/types";

interface ClientProfileStageProps {
  client: ClientRecord;
  onContinue: () => void;
  onBack: () => void;
}

function formatSar(value: number): string {
  return `${Math.round(value).toLocaleString()} SAR`;
}

export function ClientProfileStage({ client, onContinue, onBack }: ClientProfileStageProps) {
  const { profile, annualSummary, riskScore } = client;

  const spendEntries = Object.entries(annualSummary.spendBySuperCategory) as Array<
    [keyof typeof SUPER_CATEGORY_LABELS, number]
  >;
  const maxSpend = Math.max(...spendEntries.map(([, value]) => value), 1);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Client Profile
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {profile.fullName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile.id} · {profile.city} · {profile.incomeSource}
        </p>
        <div className="mt-4 flex justify-center">
          <StyleBadge label={riskScore.label} score={riskScore.score} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Base Salary" value={formatSar(profile.baseSalary)} />
        <StatCard
          label="Debt-to-Income"
          value={
            annualSummary.debtToIncomeRatio !== null
              ? `${(annualSummary.debtToIncomeRatio * 100).toFixed(1)}%`
              : "N/A"
          }
          tooltip="Monthly installment divided by base salary."
        />
        <StatCard
          label="Emergency Fund Coverage"
          value={
            annualSummary.emergencyFundCoverageMonths !== null
              ? `${annualSummary.emergencyFundCoverageMonths.toFixed(1)} mo`
              : "N/A"
          }
          tooltip="Emergency fund divided by average monthly essential spend."
        />
        <StatCard label="2024 Net Cash Flow" value={formatSar(annualSummary.netCashFlow)} />
        <StatCard label="Current Balance" value={formatSar(profile.currentBalance)} />
        <StatCard label="2024 Transactions" value={`${annualSummary.transactionCount}`} />
      </div>

      <GlassCard className="p-5">
        <h3 className="mb-1 font-semibold">2024 spending by category</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Behavior pattern: <span className="font-medium">{profile.behaviorPatternLabel}</span> ·
          Goal: <span className="font-medium">{profile.financialGoalLabel}</span>
        </p>
        <div className="space-y-2.5">
          {spendEntries.map(([category, value]) => (
            <div key={category} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0">{SUPER_CATEGORY_LABELS[category]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 transition-all duration-700"
                  style={{ width: `${(value / maxSpend) * 100}%` }}
                />
              </div>
              <span className="w-28 shrink-0 text-right font-semibold tabular-nums">
                {formatSar(value)}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
        <Button
          size="lg"
          onClick={onContinue}
          className="bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 text-white hover:opacity-90"
        >
          Continue to Market Analytics
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Not you? Enter a different Client ID
        </Button>
      </div>
    </div>
  );
}
