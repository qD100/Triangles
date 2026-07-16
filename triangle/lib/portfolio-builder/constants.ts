import type { Allocation, EtfSymbol, SuperCategory, TransactionCategory } from "./types";

export const ETF_SYMBOLS: EtfSymbol[] = ["SPY", "VXUS", "BIL", "GLD", "VNQ"];

export interface EtfMeta {
  symbol: EtfSymbol;
  fullName: string;
  category: string;
  color: { light: string; dark: string };
}

// Fixed categorical color assignment (validated palette, slots 1-5).
// Assigned once, never re-ordered by rank/weight/value.
export const ETF_META: Record<EtfSymbol, EtfMeta> = {
  SPY: {
    symbol: "SPY",
    fullName: "S&P 500 (US Large-Cap Equity)",
    category: "US Equity",
    color: { light: "#2a78d6", dark: "#3987e5" },
  },
  VXUS: {
    symbol: "VXUS",
    fullName: "Total International Stock",
    category: "International Equity",
    color: { light: "#008300", dark: "#008300" },
  },
  BIL: {
    symbol: "BIL",
    fullName: "1-3 Month Treasury Bill (Cash-like)",
    category: "Cash & Equivalents",
    color: { light: "#e87ba4", dark: "#d55181" },
  },
  GLD: {
    symbol: "GLD",
    fullName: "Gold Trust",
    category: "Commodities",
    color: { light: "#eda100", dark: "#c98500" },
  },
  VNQ: {
    symbol: "VNQ",
    fullName: "US Real Estate (REITs)",
    category: "Real Estate",
    color: { light: "#1baf7a", dark: "#199e70" },
  },
};

export const TRADING_DAYS_PER_YEAR = 252;
export const DAYS_PER_YEAR = 365.25;

// Widest bound across the source files (SPY/BIL/GLD/VNQ start 2010-01-04,
// VXUS 2011-01-28 — its real inception date). alignPriceSeries()
// inner-joins on dates present in every symbol, so the actual analyzed
// window is bottlenecked to VXUS's availability (~15 years) regardless of
// these bounds — they just need to comfortably contain all of it, not
// artificially truncate it.
export const DATA_START_DATE = "2010-01-01";
export const DATA_END_DATE = "2025-12-31";

export const DEFAULT_RISK_FREE_RATE = 0.045;
export const RISK_FREE_RATE_MIN = 0;
export const RISK_FREE_RATE_MAX = 0.1;
export const RISK_FREE_RATE_STEP = 0.0025;

export const ROLLING_VOL_WINDOW_DAYS = 21;

// Weight given to the inverse-volatility tilt when blending with the
// risk-score-interpolated baseline allocation.
export const VOL_TILT_WEIGHT = 0.25;

export const CLIENT_RISK_RAW_MIN = 2;
export const CLIENT_RISK_RAW_MAX = 112;

export const STYLE_BAND_THRESHOLDS = [20, 40, 60, 80] as const;

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  rent: "Rent",
  telecom: "Telecom",
  savings: "Savings",
  investment: "Investment",
  subscriptions: "Subscriptions",
  transfer: "Transfer",
  entertainment: "Entertainment",
  shopping: "Shopping",
  education: "Education",
  salary: "Salary",
  cash_withdrawal: "Cash Withdrawal",
  travel: "Travel",
  health: "Health",
  charity: "Charity",
  pharmacy: "Pharmacy",
  loans: "Loans",
  coffee: "Coffee",
  restaurants: "Restaurants",
  groceries: "Groceries",
  gifts: "Gifts",
  fuel: "Fuel",
};

export const SUPER_CATEGORY_LABELS: Record<SuperCategory, string> = {
  basic_needs: "Basic Needs",
  neutral_income: "Neutral (Income)",
  luxuries: "Luxuries",
  financial_obligation: "Financial Obligation",
  investment_savings: "Investment & Savings",
  growth_giving: "Growth & Giving",
};

// The spec's own three example portfolios, used as interpolation anchors
// at risk score 0 / 50 / 100.
export const ALLOCATION_ANCHORS: Record<0 | 50 | 100, Allocation> = {
  0: { SPY: 5, VXUS: 15, BIL: 50, GLD: 20, VNQ: 10 },
  50: { SPY: 35, VXUS: 25, BIL: 20, GLD: 10, VNQ: 10 },
  100: { SPY: 45, VXUS: 30, BIL: 5, GLD: 5, VNQ: 15 },
};

// Status palette — fixed, never themed, always paired with icon + label.
export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
} as const;

// Diverging pair for the correlation heatmap (blue = low/negative, red = high).
export const DIVERGING_COLORS = {
  negative: { light: "#2a78d6", dark: "#3987e5" },
  positive: { light: "#e34948", dark: "#e66767" },
  neutral: { light: "#f0efec", dark: "#383835" },
};
