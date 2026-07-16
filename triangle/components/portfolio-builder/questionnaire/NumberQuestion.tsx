"use client";

import { Input } from "@/components/ui/input";

interface NumberQuestionProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function NumberQuestion({ value, onChange }: NumberQuestionProps) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      autoFocus
      min={0}
      placeholder="Enter your age"
      className="h-14 text-lg"
      value={value ?? ""}
      onChange={(event) =>
        onChange(event.target.value === "" ? null : Number(event.target.value))
      }
    />
  );
}
