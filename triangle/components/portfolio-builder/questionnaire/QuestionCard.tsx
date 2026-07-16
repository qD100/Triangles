import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/portfolio-builder/shared/GlassCard";

interface QuestionCardProps {
  prompt: string;
  hint?: string;
  error?: string | null;
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
}

export function QuestionCard({
  prompt,
  hint,
  error,
  isFirst,
  isLast,
  onBack,
  onNext,
  children,
}: QuestionCardProps) {
  return (
    <GlassCard className="p-6 sm:p-10">
      <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        {prompt}
      </h2>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-8">{children}</div>
      {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}
      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isFirst}>
          Back
        </Button>
        <Button
          onClick={onNext}
          size="lg"
          className="bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 text-white hover:opacity-90"
        >
          {isLast ? "See my results" : "Continue"}
        </Button>
      </div>
    </GlassCard>
  );
}
