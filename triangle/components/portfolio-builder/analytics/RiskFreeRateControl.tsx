"use client";

import { Slider } from "@/components/ui/slider";
import {
  RISK_FREE_RATE_MAX,
  RISK_FREE_RATE_MIN,
  RISK_FREE_RATE_STEP,
} from "@/lib/portfolio-builder/constants";

interface RiskFreeRateControlProps {
  value: number;
  onChange: (value: number) => void;
}

export function RiskFreeRateControl({ value, onChange }: RiskFreeRateControlProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <label className="whitespace-nowrap text-sm font-medium text-muted-foreground">
        Risk-free rate:{" "}
        <span className="font-semibold text-foreground">{(value * 100).toFixed(2)}%</span>
      </label>
      <Slider
        className="sm:max-w-xs"
        value={[value]}
        min={RISK_FREE_RATE_MIN}
        max={RISK_FREE_RATE_MAX}
        step={RISK_FREE_RATE_STEP}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
    </div>
  );
}
