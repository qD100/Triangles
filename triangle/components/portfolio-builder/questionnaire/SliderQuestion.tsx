"use client";

import { Slider } from "@/components/ui/slider";

interface SliderQuestionProps {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

export function SliderQuestion({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: SliderQuestionProps) {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 bg-clip-text text-center text-4xl font-bold tabular-nums text-transparent">
        {value}
        {unit}
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}
