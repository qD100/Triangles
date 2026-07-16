"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect } from "react";

import { useQuestionnaire } from "@/components/portfolio-builder/hooks/useQuestionnaire";
import { NumberQuestion } from "./NumberQuestion";
import { ProgressBar } from "./ProgressBar";
import { QuestionCard } from "./QuestionCard";
import { SingleChoiceQuestion } from "./SingleChoiceQuestion";
import { SliderQuestion } from "./SliderQuestion";
import type { Answers } from "@/lib/portfolio-builder/types";

interface QuestionnaireProps {
  onComplete: (answers: Answers) => void;
}

export function Questionnaire({ onComplete }: QuestionnaireProps) {
  const { index, question, answers, error, isFirst, isLast, setAnswer, goNext, goBack } =
    useQuestionnaire();

  const handleNext = useCallback(() => {
    const wasLast = isLast;
    const valid = goNext();
    if (valid && wasLast) onComplete(answers);
  }, [isLast, goNext, onComplete, answers]);

  // Enter advances the question from anywhere (typing the age, having an
  // option focused, or the Continue button itself) — prevent the browser's
  // own Enter-activates-focused-button behavior so it doesn't double-fire.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <ProgressBar currentIndex={index} />
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <QuestionCard
            prompt={question.prompt}
            hint={question.hint}
            error={error}
            isFirst={isFirst}
            isLast={isLast}
            onBack={goBack}
            onNext={handleNext}
          >
            {question.type === "number" && (
              <NumberQuestion
                value={answers.age}
                onChange={(value) => setAnswer("age", value)}
              />
            )}
            {question.type === "single-choice" && (
              <SingleChoiceQuestion
                options={question.options}
                value={answers[question.id]}
                onChange={(value) =>
                  setAnswer(question.id, value as Answers[typeof question.id])
                }
              />
            )}
            {question.type === "slider" && (
              <SliderQuestion
                value={answers.monthlyInvestPercent}
                min={question.min}
                max={question.max}
                step={question.step}
                unit={question.unit}
                onChange={(value) => setAnswer("monthlyInvestPercent", value)}
              />
            )}
          </QuestionCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
