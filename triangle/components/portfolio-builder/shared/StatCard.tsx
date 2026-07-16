import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { STATUS_COLORS } from "@/lib/portfolio-builder/constants";
import type { RiskTier } from "@/lib/portfolio-builder/types";
import { GlassCard } from "./GlassCard";
import { InfoTooltip } from "./InfoTooltip";

interface StatCardProps {
  label: string;
  value: string;
  helpText?: string;
  statusTier?: RiskTier;
  tooltip?: string;
  icon?: ReactNode;
}

const TIER_CONFIG: Record<RiskTier, { label: string; icon: typeof CheckCircle2 }> = {
  good: { label: "Low risk", icon: CheckCircle2 },
  warning: { label: "Moderate risk", icon: AlertTriangle },
  critical: { label: "High risk", icon: AlertOctagon },
};

export function StatCard({
  label,
  value,
  helpText,
  statusTier,
  tooltip,
  icon,
}: StatCardProps) {
  const tierConfig = statusTier ? TIER_CONFIG[statusTier] : null;
  const TierIcon = tierConfig?.icon;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {helpText && <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>}
      {tierConfig && TierIcon && statusTier && (
        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            color: STATUS_COLORS[statusTier],
            backgroundColor: `${STATUS_COLORS[statusTier]}1a`,
          }}
        >
          <TierIcon className="size-3.5" />
          {tierConfig.label}
        </div>
      )}
    </GlassCard>
  );
}
