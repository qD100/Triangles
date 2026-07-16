export type EtfSymbol = "SPY" | "VXUS" | "BIL" | "GLD" | "VNQ";

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

export type Gender = "male" | "female";

export type FinancialGoal =
  | "buy_home"
  | "build_emergency_fund"
  | "early_retirement"
  | "children_education"
  | "debt_payoff";

export type BehaviorPattern =
  | "balanced"
  | "disciplined_saver"
  | "volatile_income"
  | "loan_dependent";

export interface ClientProfile {
  id: string;
  fullName: string;
  age: number;
  gender: Gender;
  city: string;
  baseSalary: number;
  incomeSource: string;
  financialGoal: FinancialGoal;
  financialGoalLabel: string;
  currentBalance: number;
  totalDebt: number;
  monthlyInstallment: number;
  monthlySavingsGoal: number;
  emergencyFund: number;
  maritalStatus: string;
  behaviorPattern: BehaviorPattern;
  behaviorPatternLabel: string;
}

export type TransactionType = "deposit" | "withdrawal";

export type TransactionCategory =
  | "rent"
  | "telecom"
  | "savings"
  | "investment"
  | "subscriptions"
  | "transfer"
  | "entertainment"
  | "shopping"
  | "education"
  | "salary"
  | "cash_withdrawal"
  | "travel"
  | "health"
  | "charity"
  | "pharmacy"
  | "loans"
  | "coffee"
  | "restaurants"
  | "groceries"
  | "gifts"
  | "fuel";

export type SuperCategory =
  | "basic_needs"
  | "neutral_income"
  | "luxuries"
  | "financial_obligation"
  | "investment_savings"
  | "growth_giving";

export interface ClientTransaction {
  id: string;
  clientId: string;
  date: string;
  time: string;
  merchant: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  paymentMethod: string;
  recurring: boolean;
  city: string;
  superCategory: SuperCategory;
}

export interface ClientAnnualSummary {
  year: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netCashFlow: number;
  transactionCount: number;
  spendByCategory: Record<TransactionCategory, number>;
  spendBySuperCategory: Record<SuperCategory, number>;
  monthlyEssentialSpend: number;
  debtToIncomeRatio: number | null;
  emergencyFundCoverageMonths: number | null;
}

export interface ClientRiskFactorBreakdown {
  agePoints: number;
  dtiPoints: number;
  emergencyFundPoints: number;
  behaviorPoints: number;
  goalPoints: number;
}

export interface ClientRecord {
  profile: ClientProfile;
  annualSummary: ClientAnnualSummary;
  riskScore: RiskScoreResult;
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

export type StageId = "clientId" | "loading" | "profile" | "analytics" | "recommendation";
