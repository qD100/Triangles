"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { QuestionCard } from "@/components/portfolio-builder/shared/QuestionCard";

interface ClientIdStageProps {
  onSubmit: (id: string) => void;
  error?: string | null;
}

export function ClientIdStage({ onSubmit, error }: ClientIdStageProps) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleNext = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setLocalError("Enter a client ID to continue.");
      return;
    }
    setLocalError(null);
    onSubmit(trimmed);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <QuestionCard
        prompt="What's your Client ID?"
        hint="Find this on your Namaa statement, e.g. C001."
        error={error ?? localError}
        isFirst
        isLast={false}
        onBack={() => {}}
        onNext={handleNext}
      >
        <Input
          autoFocus
          placeholder="C001"
          className="h-14 text-lg uppercase"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleNext();
            }
          }}
        />
      </QuestionCard>
    </div>
  );
}
