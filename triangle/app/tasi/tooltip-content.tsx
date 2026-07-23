export type Tone = "good" | "ok" | "warn" | "bad" | "neutral";

export interface GuideItem {
  label: string;
  description: string;
  tone?: Tone;
}

export interface GuideGroup {
  heading?: string;
  items: GuideItem[];
}

export interface TooltipContent {
  title: string;
  paragraphs?: string[];
  groups?: GuideGroup[];
  bullets?: string[];
  actions?: { text: string; tone: Tone }[];
  example?: { pair: string; actions: string[] };
  note?: string;
  exitNote?: string;
}

// --- Column header tooltips (Pairs Trading Scanner) ---
export const HEADER_TOOLTIPS: Record<string, TooltipContent> = {
  pair: {
    title: "Pair",
    paragraphs: [
      "The two stocks being statistically compared.",
      "This scanner looks for temporary deviations between these two stocks that historically move together.",
    ],
    groups: [{ items: [{ label: "Example", description: "1120 / 7010" }] }],
  },
  correlation: {
    title: "Correlation",
    paragraphs: ["Measures how similarly two stocks move over time."],
    groups: [
      {
        heading: "Range",
        items: [
          { label: "+1", description: "Move together perfectly", tone: "good" },
          { label: "0", description: "Unrelated", tone: "neutral" },
          { label: "-1", description: "Move opposite each other", tone: "bad" },
        ],
      },
      {
        heading: "General guideline",
        items: [
          { label: "0.80–1.00", description: "Excellent", tone: "good" },
          { label: "0.60–0.80", description: "Good", tone: "ok" },
          { label: "0.30–0.60", description: "Moderate", tone: "warn" },
          { label: "Below 0.30", description: "Weak", tone: "bad" },
        ],
      },
    ],
    note: "Higher absolute values usually produce more reliable pairs.",
  },
  cointegration: {
    title: "Cointegration (p-value)",
    paragraphs: [
      "Tests whether the relationship between two stocks is stable in the long run.",
      "Unlike correlation, cointegration is the most important requirement for pairs trading.",
      "Lower p-values indicate stronger statistical evidence.",
    ],
    groups: [
      {
        heading: "Guide",
        items: [
          { label: "p < 0.01", description: "Excellent", tone: "good" },
          { label: "p < 0.05", description: "Strong", tone: "ok" },
          { label: "p < 0.10", description: "Acceptable", tone: "warn" },
          { label: "p > 0.10", description: "Weak", tone: "bad" },
        ],
      },
    ],
    note: "Only cointegrated pairs should generally be traded.",
  },
  currentSpread: {
    title: "Current Spread",
    paragraphs: ["The current price difference between the two stocks after normalization."],
    groups: [
      {
        items: [
          { label: "Positive", description: "Pair is trading above its historical relationship.", tone: "warn" },
          { label: "Negative", description: "Pair is trading below its historical relationship.", tone: "ok" },
        ],
      },
    ],
    note: "Large spreads may present trading opportunities.",
  },
  zScore: {
    title: "Z-Score",
    paragraphs: ["Measures how many standard deviations today's spread is away from its historical average."],
    groups: [
      {
        heading: "Guide",
        items: [
          { label: "0", description: "Normal", tone: "neutral" },
          { label: "±1", description: "Small deviation", tone: "ok" },
          { label: "±2", description: "Trading opportunity", tone: "warn" },
          { label: "±3", description: "Extreme divergence", tone: "bad" },
        ],
      },
    ],
    note: "Higher absolute values indicate stronger mean reversion opportunities.",
  },
  halfLife: {
    title: "Half-Life",
    paragraphs: [
      "Estimated number of trading days required for the spread to revert halfway back toward its mean.",
      "Lower values indicate faster expected mean reversion.",
    ],
    groups: [
      {
        heading: "Guide",
        items: [
          { label: "<10 days", description: "Fast", tone: "good" },
          { label: "10–20 days", description: "Moderate", tone: "ok" },
          { label: "20–40 days", description: "Slow", tone: "warn" },
          { label: "40+ days", description: "Very slow", tone: "bad" },
        ],
      },
    ],
  },
  opportunityScore: {
    title: "Opportunity Score",
    paragraphs: ["A custom score from 0–100 ranking how attractive the pair is."],
    bullets: ["Correlation", "Cointegration", "Z-score", "Half-life", "Spread magnitude"],
    note: "Higher scores indicate stronger statistical setups.",
  },
  signal: {
    title: "Trading Recommendation",
    paragraphs: [
      "The scanner's suggested action based on the current statistical conditions.",
      "Hovering the signal badge shows detailed trade instructions.",
    ],
  },
  updated: {
    title: "Update Time",
    paragraphs: [
      "Shows when the pair was last refreshed.",
      '"Live" means the scanner is currently receiving real-time market data.',
    ],
  },
};

// --- Stat box tooltips (ETF vs Index Arbitrage Scanner) ---
export const STAT_TOOLTIPS: Record<string, TooltipContent> = {
  currentPremium: {
    title: "Current Premium",
    paragraphs: ["The ETF's live price minus its indicative NAV (fair value), in price points."],
    groups: [
      {
        items: [
          { label: "Positive", description: "ETF trading above NAV — richly priced.", tone: "warn" },
          { label: "Negative", description: "ETF trading below NAV — at a discount.", tone: "ok" },
          { label: "Near 0", description: "Fairly priced relative to NAV.", tone: "neutral" },
        ],
      },
    ],
    note: "Extreme values relative to this ETF's own history are what the scanner flags as opportunities.",
  },
  averagePremium: {
    title: "Average Premium",
    paragraphs: [
      "The historical mean tracking premium over the lookback window — this ETF's own 'normal' baseline.",
      "Some ETFs persistently trade slightly rich or cheap; the current premium is compared against this, not necessarily zero.",
    ],
  },
  volatility: {
    title: "Volatility (σ)",
    paragraphs: ["The standard deviation of the premium series — how much it typically swings day to day."],
    groups: [
      {
        items: [
          { label: "Low", description: "Stable tracking — signals are more trustworthy.", tone: "good" },
          { label: "High", description: "Noisy series — z-score crossings may be less meaningful.", tone: "bad" },
        ],
      },
    ],
  },
  opportunityScore: {
    title: "Opportunity Score",
    paragraphs: ["A custom 0–100 score ranking how attractive this ETF's current mispricing is."],
    bullets: ["Z-score magnitude", "Signal confidence", "Speed of expected mean reversion"],
    note: "Higher scores indicate a stronger, more statistically confident setup.",
  },
  signalConfidence: {
    title: "Signal Confidence",
    paragraphs: ["An estimate of how reliable the current signal is, based on the consistency of the underlying statistics."],
    groups: [
      {
        items: [
          { label: "High %", description: "Strong statistical basis for the signal.", tone: "good" },
          { label: "Low %", description: "Treat the signal with caution — could be noise.", tone: "bad" },
        ],
      },
    ],
  },
  daysAbove2Sigma: {
    title: "Days Above 2σ",
    paragraphs: ["Number of days in the lookback window the premium spent above +2 standard deviations (persistently rich)."],
    note: "A high count can mean this ETF frequently overshoots — consider whether ±2σ is a well-calibrated threshold for it specifically.",
  },
  daysBelow2Sigma: {
    title: "Days Below -2σ",
    paragraphs: ["Number of days in the lookback window the premium spent below -2 standard deviations (persistently cheap)."],
    note: "Mirrors 'Days Above 2σ' for the discount side.",
  },
  fairValue: {
    title: "Fair Value",
    paragraphs: ["The modeled price this ETF 'should' trade at if its premium reverted to its historical average."],
    note: "Used as the reference point for Deviation.",
  },
  deviation: {
    title: "Deviation",
    paragraphs: ["How far the current price is from Fair Value, as a percentage."],
    groups: [
      {
        items: [
          { label: "Positive", description: "Trading above fair value — rich.", tone: "warn" },
          { label: "Negative", description: "Trading below fair value — cheap.", tone: "ok" },
        ],
      },
    ],
  },
};

// --- Chart card tooltips (ETF vs Index Arbitrage Scanner) ---
export const CHART_TOOLTIPS: Record<string, TooltipContent> = {
  premiumTimeSeries: {
    title: "Premium / Discount Time Series",
    paragraphs: ["The day-by-day tracking premium, with the historical average overlaid as a dashed reference line."],
    note: "Look for the current value sitting unusually far from the dashed mean — that's the visual version of a high z-score.",
  },
  rollingZScore: {
    title: "Rolling Z-Score (20/50/100)",
    paragraphs: [
      "The premium expressed in standard-deviation units across three rolling windows, so short-term and longer-term dislocation can be compared.",
    ],
    note: "Entries/exits are typically judged against the ±2σ (opportunity) and ±3σ (extreme) bands.",
  },
  deviationHistogram: {
    title: "Deviation Histogram & Distribution Curve",
    paragraphs: ["The historical distribution of the premium's deviations, with a fitted normal curve overlaid."],
    note: "A current reading in the tails (edges) of this distribution is genuinely rare; one near the center is closer to typical noise.",
  },
  meanReversionProjection: {
    title: "Mean Reversion Projection",
    paragraphs: [
      "A modeled forecast of how the premium is expected to decay back toward its historical mean, based on the estimated half-life.",
    ],
    note: "A steeper curve implies a shorter expected holding period for the trade to play out.",
  },
  normalizedPriceComparison: {
    title: "Normalized Price Comparison",
    paragraphs: ["The ETF and its benchmark index, both indexed to a common starting value of 100."],
    note: "A sanity check independent of the premium math — the two lines should broadly track together; sustained separation is tracking error.",
  },
  premiumHeatmap: {
    title: "Premium Heatmap (weekly avg, all ETFs)",
    paragraphs: ["Every tracked ETF's weekly average premium side by side, colored by magnitude."],
    note: "Useful for spotting whether a mispricing is isolated to one ETF or part of a broader, market-wide pattern.",
  },
};

// --- Signal badge tooltips — shared between ETF and Pairs signals ---
export const SIGNAL_TOOLTIPS: Record<string, TooltipContent> = {
  ENTRY_LONG: {
    title: "Entry Long",
    paragraphs: ["The spread is significantly below its historical average."],
    note: "Expected outcome: the spread is likely to rise back toward its mean.",
    actions: [
      { text: "BUY the first stock in the pair", tone: "good" },
      { text: "SELL (short) the second stock", tone: "bad" },
    ],
    example: { pair: "1120 / 1080", actions: ["BUY 1120", "SELL 1080"] },
    exitNote: "Close both positions when the Z-score returns near 0.",
  },
  ENTRY_SHORT: {
    title: "Entry Short",
    paragraphs: ["The spread is significantly above its historical average."],
    note: "Expected outcome: the spread is likely to fall back toward its mean.",
    actions: [
      { text: "SELL (short) the first stock", tone: "bad" },
      { text: "BUY the second stock", tone: "good" },
    ],
    example: { pair: "1050 / 2170", actions: ["SELL 1050", "BUY 2170"] },
    exitNote: "Close both positions when the spread normalizes and the Z-score approaches 0.",
  },
  EXTREME_DIVERGENCE: {
    title: "Extreme Divergence",
    paragraphs: ["The pair is extremely far from its historical equilibrium."],
    bullets: [
      "A very strong mean-reversion opportunity, or",
      "A structural break caused by major news or fundamental changes.",
    ],
    groups: [
      {
        heading: "Recommendation",
        items: [
          { label: "•", description: "Wait for confirmation before entering.", tone: "warn" },
          { label: "•", description: "Check recent news affecting either company.", tone: "warn" },
          { label: "•", description: "Use tighter risk management.", tone: "warn" },
        ],
      },
    ],
    note: "Extreme divergence has the highest potential reward but also the highest risk.",
  },
  NORMAL: {
    title: "Neutral",
    paragraphs: ["No statistical edge currently exists."],
    groups: [
      {
        heading: "Recommendation",
        items: [
          { label: "•", description: "Do not open a position.", tone: "neutral" },
          { label: "•", description: "Continue monitoring until the spread reaches a more favorable level.", tone: "neutral" },
        ],
      },
    ],
  },
  WATCH: {
    title: "Watch",
    paragraphs: [
      "The pair is approaching a statistically significant deviation but hasn't yet reached the entry threshold (±2σ).",
    ],
    groups: [
      {
        heading: "Recommendation",
        items: [
          { label: "•", description: "Monitor closely — no position yet.", tone: "warn" },
          { label: "•", description: "Wait for the Z-score to cross ±2 before considering entry.", tone: "warn" },
        ],
      },
    ],
  },
  EXIT: {
    title: "Exit",
    paragraphs: ["The spread has reverted back near its historical mean (within ±0.5σ)."],
    groups: [
      {
        heading: "Recommendation",
        items: [
          { label: "•", description: "If you hold an open position on this pair, consider closing it to lock in the mean-reversion profit.", tone: "ok" },
        ],
      },
    ],
  },
  COINTEGRATION_BROKEN: {
    title: "Cointegration Broken",
    paragraphs: [
      "This pair no longer shows a statistically stable long-run relationship (p-value > 0.10).",
    ],
    groups: [
      {
        heading: "Recommendation",
        items: [
          { label: "•", description: "Avoid new positions on this pair until cointegration is re-established.", tone: "bad" },
          { label: "•", description: "Close any existing position — the statistical basis for mean reversion no longer holds.", tone: "bad" },
        ],
      },
    ],
  },
  // ETF-scanner signals (SignalBadge is shared between both scanners)
  BUY_DISCOUNT: {
    title: "Buy Discount",
    paragraphs: ["The ETF is trading notably below its fair value / indicative NAV."],
    note: "Expected outcome: price is likely to rise back toward NAV.",
    groups: [
      {
        heading: "Recommendation",
        items: [{ label: "•", description: "Consider buying — the discount typically closes as authorized participants arbitrage the gap.", tone: "good" }],
      },
    ],
  },
  SELL_PREMIUM: {
    title: "Sell Premium",
    paragraphs: ["The ETF is trading notably above its fair value / indicative NAV."],
    note: "Expected outcome: price is likely to fall back toward NAV.",
    groups: [
      {
        heading: "Recommendation",
        items: [{ label: "•", description: "Consider avoiding new purchases, or selling if held — the premium typically closes via arbitrage.", tone: "bad" }],
      },
    ],
  },
  EXTREME_MISPRICING: {
    title: "Extreme Mispricing",
    paragraphs: ["The ETF is extremely far from its indicative NAV — beyond the normal tracking range."],
    bullets: [
      "A very strong arbitrage opportunity, or",
      "A liquidity or data issue in the underlying benchmark.",
    ],
    note: "Extreme mispricing has the highest potential reward but also the highest risk — verify before acting.",
  },
};
