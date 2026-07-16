"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AnalyticsDashboard } from "@/components/portfolio-builder/analytics/AnalyticsDashboard";
import { useStageFlow } from "@/components/portfolio-builder/hooks/useStageFlow";
import { LoadingStage } from "@/components/portfolio-builder/LoadingStage";
import { Questionnaire } from "@/components/portfolio-builder/questionnaire/Questionnaire";
import { RecommendationDashboard } from "@/components/portfolio-builder/recommendation/RecommendationDashboard";
import { computeRiskScore } from "@/lib/portfolio-builder/risk-score";
import type { AnalyticsBundle, Answers } from "@/lib/portfolio-builder/types";

interface PortfolioBuilderAppProps {
  initialAnalytics: AnalyticsBundle;
}

const EMPTY_ANSWERS: Answers = {
  age: null,
  horizon: null,
  lossReaction: null,
  goal: null,
  experience: null,
  monthlyInvestPercent: 10,
};

export function PortfolioBuilderApp({ initialAnalytics }: PortfolioBuilderAppProps) {
  const { stage, completeQuestionnaire, goToRecommendation, restart } = useStageFlow();
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [riskFreeRate, setRiskFreeRate] = useState(initialAnalytics.riskFreeRateDefault);

  const handleQuestionnaireComplete = useCallback(
    (finalAnswers: Answers) => {
      setAnswers(finalAnswers);
      completeQuestionnaire();
    },
    [completeQuestionnaire]
  );

  const handleRestart = useCallback(() => {
    setAnswers(EMPTY_ANSWERS);
    setRiskFreeRate(initialAnalytics.riskFreeRateDefault);
    restart();
  }, [restart, initialAnalytics.riskFreeRateDefault]);

  const riskScore = useMemo(() => computeRiskScore(answers), [answers]);

  // Always land at the top of a new stage — otherwise a tall stage (analytics/
  // recommendation) can render starting mid-scroll from wherever a short stage
  // (loading) left the viewport.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [stage]);

  return (
    <div className="relative min-h-screen font-sans text-foreground bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950">
      {/* Decorative background, fixed to the viewport so it never affects document height/scroll. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute top-0 right-0 h-[30rem] w-[30rem] rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-500/10" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Portfolio Builder
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Build a portfolio backed by 6 years of market data
          </h1>
        </header>

        <AnimatePresence mode="wait">
          {stage === "questionnaire" && (
            <motion.div
              key="questionnaire"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Questionnaire onComplete={handleQuestionnaireComplete} />
            </motion.div>
          )}

          {stage === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <LoadingStage />
            </motion.div>
          )}

          {stage === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnalyticsDashboard
                analytics={initialAnalytics}
                riskFreeRate={riskFreeRate}
                onRiskFreeRateChange={setRiskFreeRate}
                onContinue={goToRecommendation}
              />
            </motion.div>
          )}

          {stage === "recommendation" && (
            <motion.div
              key="recommendation"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <RecommendationDashboard
                analytics={initialAnalytics}
                answers={answers}
                riskScore={riskScore}
                onRestart={handleRestart}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
