"use client";

import { useCallback, useState } from "react";

import { QUESTIONS } from "@/lib/portfolio-builder/questions";
import type { Answers } from "@/lib/portfolio-builder/types";

const DEFAULT_ANSWERS: Answers = {
  age: null,
  horizon: null,
  lossReaction: null,
  goal: null,
  experience: null,
  monthlyInvestPercent: 10,
};

export function useQuestionnaire() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [error, setError] = useState<string | null>(null);

  const question = QUESTIONS[index];
  const isFirst = index === 0;
  const isLast = index === QUESTIONS.length - 1;
  const progress = ((index + 1) / QUESTIONS.length) * 100;

  const setAnswer = useCallback(<K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const goNext = useCallback((): boolean => {
    if (question.type === "number") {
      const validationError = question.validate(answers.age);
      if (validationError) {
        setError(validationError);
        return false;
      }
    } else if (question.type === "single-choice") {
      if (!answers[question.id]) {
        setError("Choose an option to continue.");
        return false;
      }
    }
    if (!isLast) setIndex((i) => i + 1);
    return true;
  }, [question, answers, isLast]);

  const goBack = useCallback(() => {
    setError(null);
    if (!isFirst) setIndex((i) => i - 1);
  }, [isFirst]);

  const reset = useCallback(() => {
    setIndex(0);
    setAnswers(DEFAULT_ANSWERS);
    setError(null);
  }, []);

  return {
    index,
    question,
    answers,
    error,
    isFirst,
    isLast,
    progress,
    setAnswer,
    goNext,
    goBack,
    reset,
  };
}
