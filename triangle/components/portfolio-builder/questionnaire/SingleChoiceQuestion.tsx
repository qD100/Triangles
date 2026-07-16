"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SingleChoiceQuestionProps {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
}

export function SingleChoiceQuestion({
  options,
  value,
  onChange,
}: SingleChoiceQuestionProps) {
  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={(next) => onChange(String(next))}
      className="gap-3"
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-base font-medium transition-all",
              selected
                ? "border-transparent bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-violet-500/10 ring-2 ring-blue-500/60"
                : "border-border/60 bg-background/40 hover:border-blue-400/50 hover:bg-blue-500/5"
            )}
          >
            <span>{option.label}</span>
            <RadioGroupItem value={option.value} />
          </label>
        );
      })}
    </RadioGroup>
  );
}
