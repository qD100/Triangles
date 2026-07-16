import { RISK_SCORE_RAW_MAX, RISK_SCORE_RAW_MIN } from "./constants";
import { scoreToStyleLabel } from "./style-label";
import type { Answers, RiskScoreResult } from "./types";

function ageWeight(age: number | null): number {
  if (age === null) return 0;
  if (age <= 30) return 20;
  if (age <= 45) return 15;
  if (age <= 60) return 8;
  return 2;
}

const HORIZON_WEIGHTS: Record<NonNullable<Answers["horizon"]>, number> = {
  lt2: 5,
  "2to5": 15,
  gt5: 30,
};

const LOSS_REACTION_WEIGHTS: Record<NonNullable<Answers["lossReaction"]>, number> = {
  sell_all: 0,
  sell_some: 10,
  hold: 20,
  buy_more: 30,
};

const GOAL_WEIGHTS: Record<NonNullable<Answers["goal"]>, number> = {
  preserve: 0,
  income: 10,
  balanced: 20,
  growth: 30,
  aggressive: 40,
};

const EXPERIENCE_WEIGHTS: Record<NonNullable<Answers["experience"]>, number> = {
  none: 0,
  beginner: 5,
  intermediate: 10,
  advanced: 15,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Raw score range is [7, 135], not [0, 135] — every category has a nonzero
 * floor — so min-max normalization (not raw/135) is what maps the most
 * conservative answer set to 0 and the most aggressive to 100.
 */
export function computeRiskScore(answers: Answers): RiskScoreResult {
  const raw =
    ageWeight(answers.age) +
    (answers.horizon ? HORIZON_WEIGHTS[answers.horizon] : 0) +
    (answers.lossReaction ? LOSS_REACTION_WEIGHTS[answers.lossReaction] : 0) +
    (answers.goal ? GOAL_WEIGHTS[answers.goal] : 0) +
    (answers.experience ? EXPERIENCE_WEIGHTS[answers.experience] : 0);

  const score = Math.round(
    clamp(
      ((raw - RISK_SCORE_RAW_MIN) / (RISK_SCORE_RAW_MAX - RISK_SCORE_RAW_MIN)) * 100,
      0,
      100
    )
  );

  return { raw, score, label: scoreToStyleLabel(score) };
}
