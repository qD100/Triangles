"use client";

import { useCallback, useRef, useState } from "react";

import type { StageId } from "@/lib/portfolio-builder/types";

const LOADING_DURATION_MS = 1400;

export function useStageFlow() {
  const [stage, setStage] = useState<StageId>("questionnaire");
  const loadingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const completeQuestionnaire = useCallback(() => {
    setStage("loading");
    loadingTimeout.current = setTimeout(() => setStage("analytics"), LOADING_DURATION_MS);
  }, []);

  const goToRecommendation = useCallback(() => setStage("recommendation"), []);

  const restart = useCallback(() => {
    if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    setStage("questionnaire");
  }, []);

  return { stage, completeQuestionnaire, goToRecommendation, restart };
}
