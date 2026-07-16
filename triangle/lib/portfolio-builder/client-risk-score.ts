import { CLIENT_RISK_RAW_MAX, CLIENT_RISK_RAW_MIN } from "./constants";
import { scoreToStyleLabel } from "./style-label";
import type {
  BehaviorPattern,
  ClientAnnualSummary,
  ClientProfile,
  ClientRiskFactorBreakdown,
  FinancialGoal,
  RiskScoreResult,
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ageWeight(age: number): number {
  if (age <= 30) return 12;
  if (age <= 45) return 9;
  if (age <= 60) return 5;
  return 2;
}

function dtiWeight(dti: number | null): number {
  if (dti === null) return 14;
  if (dti <= 0) return 28;
  if (dti <= 0.1) return 22;
  if (dti <= 0.2) return 14;
  if (dti <= 0.35) return 6;
  return 0;
}

function emergencyFundWeight(months: number | null): number {
  if (months === null) return 14;
  if (months <= 0) return 0;
  if (months < 3) return 7;
  if (months < 6) return 14;
  if (months < 12) return 21;
  return 28;
}

const BEHAVIOR_WEIGHTS: Record<BehaviorPattern, number> = {
  disciplined_saver: 26,
  balanced: 16,
  volatile_income: 8,
  loan_dependent: 0,
};

const GOAL_WEIGHTS: Record<FinancialGoal, number> = {
  early_retirement: 18,
  buy_home: 12,
  children_education: 12,
  build_emergency_fund: 6,
  debt_payoff: 0,
};

/**
 * Financial capacity, not self-reported willingness: every factor is
 * derived from the client's real profile + their own 2024 transaction
 * history, not a survey answer.
 */
export function computeClientRiskFactors(
  profile: ClientProfile,
  summary: ClientAnnualSummary
): ClientRiskFactorBreakdown {
  return {
    agePoints: ageWeight(profile.age),
    dtiPoints: dtiWeight(summary.debtToIncomeRatio),
    emergencyFundPoints: emergencyFundWeight(summary.emergencyFundCoverageMonths),
    behaviorPoints: BEHAVIOR_WEIGHTS[profile.behaviorPattern],
    goalPoints: GOAL_WEIGHTS[profile.financialGoal],
  };
}

export function computeClientRiskScore(
  profile: ClientProfile,
  summary: ClientAnnualSummary
): RiskScoreResult {
  const factors = computeClientRiskFactors(profile, summary);
  const raw =
    factors.agePoints +
    factors.dtiPoints +
    factors.emergencyFundPoints +
    factors.behaviorPoints +
    factors.goalPoints;

  const score = Math.round(
    clamp(((raw - CLIENT_RISK_RAW_MIN) / (CLIENT_RISK_RAW_MAX - CLIENT_RISK_RAW_MIN)) * 100, 0, 100)
  );

  return { raw, score, label: scoreToStyleLabel(score) };
}
