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
  note?: string;
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
    note: "Pairs without cointegration carry a higher risk that the spread will not revert to its historical relationship.",
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
    note: "Large spreads indicate elevated divergence risk relative to the pair's historical relationship.",
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
          { label: "±2", description: "Elevated divergence", tone: "warn" },
          { label: "±3", description: "Extreme divergence", tone: "bad" },
        ],
      },
    ],
    note: "Higher absolute values indicate a higher statistical probability of mean reversion — but also higher risk if the relationship has broken down.",
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
    paragraphs: ["A custom score from 0–100 combining correlation, cointegration strength, divergence magnitude, and reversion speed into a single ranking."],
    bullets: ["Correlation", "Cointegration", "Z-score", "Half-life", "Spread magnitude"],
    note: "Higher scores indicate stronger statistical setups.",
  },
  signal: {
    title: "Signal",
    paragraphs: [
      "The scanner's classification of the pair's current statistical state.",
      "Hovering the signal badge shows the underlying divergence/convergence risk detail.",
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
    paragraphs: ["A custom 0–100 score combining the ETF's z-score magnitude, signal confidence, and expected reversion speed into a single ranking."],
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
    note: "Divergence risk is typically assessed against the ±2σ (elevated) and ±3σ (extreme) bands.",
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
    note: "A steeper curve implies a shorter expected time for the divergence to fully converge.",
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
// Deliberately risk/probability framed, never instructional: no buy/sell,
// long/short, or "enter/close a position" language anywhere below. Each
// entry states what the data shows and how that maps to a divergence or
// convergence probability, not what to do about it.
export const SIGNAL_TOOLTIPS: Record<string, TooltipContent> = {
  ENTRY_LONG: {
    title: "Diverged Below Mean",
    paragraphs: ["The spread has moved significantly below its historical average (beyond ±2σ)."],
    groups: [
      {
        heading: "Risk profile",
        items: [
          { label: "•", description: "Deviations at this magnitude have historically preceded convergence back toward the mean — an elevated convergence probability.", tone: "ok" },
          { label: "•", description: "This holds only while the pair remains cointegrated — if the relationship breaks, the spread may not revert.", tone: "warn" },
        ],
      },
    ],
    note: "States a statistical condition, not a recommendation — direction (below mean) is a fact about the data, not an instruction.",
  },
  ENTRY_SHORT: {
    title: "Diverged Above Mean",
    paragraphs: ["The spread has moved significantly above its historical average (beyond ±2σ)."],
    groups: [
      {
        heading: "Risk profile",
        items: [
          { label: "•", description: "Deviations at this magnitude have historically preceded convergence back toward the mean — an elevated convergence probability.", tone: "ok" },
          { label: "•", description: "This holds only while the pair remains cointegrated — if the relationship breaks, the spread may not revert.", tone: "warn" },
        ],
      },
    ],
    note: "States a statistical condition, not a recommendation — direction (above mean) is a fact about the data, not an instruction.",
  },
  EXTREME_DIVERGENCE: {
    title: "Extreme Divergence",
    paragraphs: ["The pair is extremely far from its historical equilibrium (beyond ±3σ)."],
    bullets: [
      "A very high convergence probability, if the statistical relationship still holds, or",
      "A structural break caused by major news or fundamental changes to either company.",
    ],
    groups: [
      {
        heading: "Risk factors",
        items: [
          { label: "•", description: "Extreme deviations carry more uncertainty about whether convergence will occur at all.", tone: "warn" },
          { label: "•", description: "Worth checking whether recent news affects either company's fundamentals.", tone: "warn" },
        ],
      },
    ],
    note: "Extreme divergence carries both the highest convergence probability and the highest risk that the relationship has broken.",
  },
  NORMAL: {
    title: "Normal",
    paragraphs: ["No statistically significant divergence currently exists."],
    note: "Divergence risk is low — the spread sits within its typical historical range.",
  },
  WATCH: {
    title: "Watch",
    paragraphs: [
      "The pair is approaching a statistically significant deviation but hasn't yet crossed the elevated-divergence threshold (±2σ).",
    ],
    note: "Divergence risk is building but not yet elevated.",
  },
  EXIT: {
    title: "Converged",
    paragraphs: ["The spread has reverted back near its historical mean (within ±0.5σ)."],
    note: "Divergence risk is currently low — the relationship has normalized.",
  },
  COINTEGRATION_BROKEN: {
    title: "Cointegration Broken",
    paragraphs: [
      "This pair no longer shows a statistically stable long-run relationship (p-value > 0.10).",
    ],
    note: "Without cointegration, there is no reliable statistical basis for a convergence probability on this pair.",
  },
  // ETF-scanner signals (SignalBadge is shared between both scanners)
  BUY_DISCOUNT: {
    title: "Trading at Discount",
    paragraphs: ["The ETF is trading notably below its fair value / indicative NAV."],
    note: "Discounts of this magnitude have historically closed as authorized participants arbitrage the gap — an elevated convergence probability toward NAV.",
  },
  SELL_PREMIUM: {
    title: "Trading at Premium",
    paragraphs: ["The ETF is trading notably above its fair value / indicative NAV."],
    note: "Premiums of this magnitude have historically closed back toward NAV — an elevated convergence probability.",
  },
  EXTREME_MISPRICING: {
    title: "Extreme Mispricing",
    paragraphs: ["The ETF is extremely far from its indicative NAV — beyond the normal tracking range."],
    bullets: [
      "A very high convergence probability toward NAV, or",
      "A liquidity or data issue in the underlying benchmark.",
    ],
    note: "Extreme mispricing carries both a higher convergence probability and a higher risk that the deviation reflects a data or liquidity issue rather than a true price dislocation.",
  },
};
