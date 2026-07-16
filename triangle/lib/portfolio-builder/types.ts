export type EtfSymbol = "SPY" | "VXUS" | "SGOV" | "GLD" | "VNQ";

export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
}

export interface EtfStats {
  symbol: EtfSymbol;
  annualizedReturn: number;
  dailyVolatility: number;
  annualizedVolatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  volatilityRank: number; // 1 = lowest volatility ... N = highest
  riskTier: RiskTier;
}

export type RiskTier = "good" | "warning" | "critical";

export interface AnalyticsBundle {
  symbols: EtfSymbol[];
  dates: string[];
  dailyReturns: Record<EtfSymbol, number[]>;
  growth10k: Record<EtfSymbol, number[]>;
  rollingVolatility: Record<EtfSymbol, Array<number | null>>;
  stats: Record<EtfSymbol, EtfStats>;
  correlationMatrix: number[][];
  covarianceMatrix: number[][];
  riskFreeRateDefault: number;
  dataStartDate: string;
  dataEndDate: string;
}

export type TimeHorizon = "lt2" | "2to5" | "gt5";
export type LossReaction = "sell_all" | "sell_some" | "hold" | "buy_more";
export type InvestmentGoal =
  | "preserve"
  | "income"
  | "balanced"
  | "growth"
  | "aggressive";
export type ExperienceLevel = "none" | "beginner" | "intermediate" | "advanced";

export interface Answers {
  age: number | null;
  horizon: TimeHorizon | null;
  lossReaction: LossReaction | null;
  goal: InvestmentGoal | null;
  experience: ExperienceLevel | null;
  monthlyInvestPercent: number;
}

export type StyleLabel =
  | "Conservative"
  | "Moderately Conservative"
  | "Balanced"
  | "Growth"
  | "Aggressive";

export interface RiskScoreResult {
  raw: number;
  score: number;
  label: StyleLabel;
}

export type Allocation = Record<EtfSymbol, number>;

export interface AllocationResult {
  baseline: Allocation;
  final: Allocation;
}

export interface PortfolioMetrics {
  expectedVolatility: number;
  historicalCagr: number;
  worstDrawdown: number;
  diversificationScore: number;
  growth10k: number[];
}

export type StageId = "questionnaire" | "loading" | "analytics" | "recommendation";
