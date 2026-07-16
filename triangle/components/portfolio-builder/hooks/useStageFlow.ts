"use client";

import { useCallback, useState } from "react";

import type { StageId } from "@/lib/portfolio-builder/types";

export function useStageFlow() {
  const [stage, setStage] = useState<StageId>("clientId");

  const startLookup = useCallback(() => setStage("loading"), []);
  const goToClientId = useCallback(() => setStage("clientId"), []);
  const goToProfile = useCallback(() => setStage("profile"), []);
  const goToAnalytics = useCallback(() => setStage("analytics"), []);
  const goToRecommendation = useCallback(() => setStage("recommendation"), []);
  const restart = useCallback(() => setStage("clientId"), []);

  return {
    stage,
    startLookup,
    goToClientId,
    goToProfile,
    goToAnalytics,
    goToRecommendation,
    restart,
  };
}
