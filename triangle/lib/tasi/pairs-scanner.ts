import { getSeriesWithFallback, type PriceSeries } from "./mock-data";
import { STOCK_UNIVERSE, type StockDefinition } from "./universe";
import { alignByDate, indexTo100 } from "./finance";
import { mean, stddev, rollingZScore, logReturns, histogram, normalPdf, type HistogramBin } from "./statistics";
import { pearsonCorrelation, rollingCorrelation } from "./correlation";
import { olsRegression } from "./regression";
import { testCointegration } from "./cointegration";
import { estimateHalfLife } from "./halfLife";
import { classifyPairSignal, computeOpportunityScore, DEFAULT_THRESHOLDS, type PairSignal } from "./opportunityScore";

const ROLLING_WINDOW = 50; // the window used for "the" rolling correlation/z-score shown in the scanner table
const ROLLING_STEP = 5; // subsampling step for expensive rolling recomputation (cointegration, beta) in the detail view

export interface PairScannerRow {
  pairKey: string;
  symbolA: string;
  nameA: string;
  sectorA: string;
  symbolB: string;
  nameB: string;
  sectorB: string;
  correlation: number | null;
  rollingCorrelation: number | null;
  cointegrationPValue: number | null;
  adfStatistic: number | null;
  isCointegrated: boolean;
  hedgeRatio: number | null;
  returnsBeta: number | null;
  currentSpread: number | null;
  averageSpread: number;
  stdSpread: number;
  currentZScore: number | null;
  halfLifeDays: number | null;
  // Spread mean is ~0 by construction (an OLS-residual property, not a
  // finding) — expectedReversionPriceA is the actually-informative figure:
  // the price stock A would trade at, given B's current price, for the
  // spread to sit at its historical mean.
  expectedReversionValue: number;
  expectedReversionPriceA: number;
  signal: PairSignal;
  opportunityScore: number;
  tradeConfidence: number;
}

export interface PairsScannerResult {
  updatedAt: string;
  universeSize: number;
  pairCount: number;
  rows: PairScannerRow[];
  warnings: string[];
}

interface UniverseEntry extends StockDefinition {
  series: PriceSeries;
}

async function fetchUniverse(): Promise<{ entries: UniverseEntry[]; warnings: string[] }> {
  const warnings: string[] = [];
  const settled = await Promise.allSettled(
    STOCK_UNIVERSE.map((def) => getSeriesWithFallback(def.symbol, "2y")),
  );

  const entries: UniverseEntry[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      entries.push({ ...STOCK_UNIVERSE[i], series: result.value });
      if (result.value.isSimulated) {
        warnings.push(`${STOCK_UNIVERSE[i].symbol}: live data unavailable, using simulated series.`);
      }
    } else {
      warnings.push(`${STOCK_UNIVERSE[i].symbol}: failed to load, excluded from pairs.`);
    }
  });

  return { entries, warnings };
}

function computePairSummary(a: UniverseEntry, b: UniverseEntry): PairScannerRow | null {
  const aligned = alignByDate(a.series.bars, b.series.bars);
  if (aligned.length < 30) return null;

  const pricesA = aligned.map((p) => p.a);
  const pricesB = aligned.map((p) => p.b);

  const correlation = pearsonCorrelation(pricesA, pricesB);
  const rollingCorr = rollingCorrelation(pricesA, pricesB, ROLLING_WINDOW).at(-1) ?? null;

  const cointegration = testCointegration(pricesA, pricesB);
  const spread = cointegration.spread;
  const zScoreSeries = rollingZScore(spread, ROLLING_WINDOW);
  const currentZScore = zScoreSeries.at(-1) ?? null;

  const returnsA = logReturns(pricesA);
  const returnsB = logReturns(pricesB);
  const returnsBeta = returnsB.length > 1 ? olsRegression(returnsA, returnsB).beta : null;

  const averageSpread = mean(spread);
  const stdSpread = stddev(spread);
  const halfLifeDays = estimateHalfLife(spread);
  const currentPriceB = pricesB.at(-1) ?? 0;
  const expectedReversionPriceA =
    cointegration.hedgeRatio * currentPriceB + cointegration.intercept + averageSpread;

  const signal = classifyPairSignal(currentZScore, cointegration.pValueApprox);
  const confidence = Math.min(Math.max(1 - cointegration.pValueApprox, 0), 1);
  const opportunityScore = computeOpportunityScore({
    zScore: currentZScore,
    confidence,
    halfLifeDays,
  });

  return {
    pairKey: `${a.symbol}/${b.symbol}`,
    symbolA: a.symbol,
    nameA: a.name,
    sectorA: a.sector,
    symbolB: b.symbol,
    nameB: b.name,
    sectorB: b.sector,
    correlation,
    rollingCorrelation: rollingCorr,
    cointegrationPValue: cointegration.pValueApprox,
    adfStatistic: cointegration.adfStatistic,
    isCointegrated: cointegration.isCointegrated,
    hedgeRatio: cointegration.hedgeRatio,
    returnsBeta,
    currentSpread: spread.at(-1) ?? null,
    averageSpread,
    stdSpread,
    currentZScore,
    halfLifeDays,
    expectedReversionValue: averageSpread,
    expectedReversionPriceA,
    signal,
    opportunityScore,
    tradeConfidence: confidence,
  };
}

export async function getPairsScannerData(): Promise<PairsScannerResult> {
  const { entries, warnings } = await fetchUniverse();
  const rows: PairScannerRow[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const row = computePairSummary(entries[i], entries[j]);
      if (row) rows.push(row);
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    universeSize: entries.length,
    pairCount: rows.length,
    rows,
    warnings,
  };
}

// --- Detail view: full series for one selected pair's charts ---

export interface PairDetailPoint {
  date: string;
  aIndexed: number;
  bIndexed: number;
  spread: number;
  zScore: number | null;
  rollingCorrelation: number | null;
}

export interface PairDetail {
  symbolA: string;
  nameA: string;
  symbolB: string;
  nameB: string;
  hedgeRatio: number;
  returnsBeta: number | null;
  cointegrationPValue: number;
  adfStatistic: number;
  isCointegrated: boolean;
  halfLifeDays: number | null;
  series: PairDetailPoint[];
  scatter: { x: number; y: number }[];
  regressionLine: { x: number; y: number }[];
  residualHistogram: HistogramBin[];
  residualDistribution: { x: number; density: number }[];
  rollingCointegration: { date: string; pValue: number }[];
  rollingBeta: { date: string; beta: number }[];
  meanReversionForecast: { day: number; projected: number }[];
  // Sharpe ratio applied directly to the spread's own daily changes
  // (annualized) — a simplification, not a backtested position P&L, and
  // labeled as such in the UI.
  sharpeRatio: number | null;
  // Empirical backtest: of all historical entry-threshold crossings, what
  // fraction reverted to the exit threshold within the horizon (vs. timing
  // out) — real computation over the fetched history, not a fabricated figure.
  winProbability: number | null;
  tradeConfidence: number;
}

// Backtests the entry/exit rule against history: each time |z| crosses the
// entry threshold, check whether it reverts to the exit threshold within
// `horizonDays` (a "win") or times out (a "loss").
function computeWinProbability(
  zScores: (number | null)[],
  entryThreshold: number,
  exitThreshold: number,
  horizonDays: number,
): number | null {
  let attempts = 0;
  let wins = 0;
  let inExtreme = false;
  let entryIndex = -1;

  for (let i = 0; i < zScores.length; i++) {
    const z = zScores[i];
    if (z === null) continue;
    if (!inExtreme && Math.abs(z) > entryThreshold) {
      inExtreme = true;
      entryIndex = i;
    } else if (inExtreme) {
      if (Math.abs(z) < exitThreshold) {
        attempts++;
        wins++;
        inExtreme = false;
      } else if (i - entryIndex > horizonDays) {
        attempts++;
        inExtreme = false;
      }
    }
  }

  return attempts > 0 ? wins / attempts : null;
}

export async function getPairDetailData(symbolA: string, symbolB: string): Promise<PairDetail | null> {
  const defA = STOCK_UNIVERSE.find((s) => s.symbol === symbolA);
  const defB = STOCK_UNIVERSE.find((s) => s.symbol === symbolB);
  if (!defA || !defB) return null;

  const [seriesA, seriesB] = await Promise.all([
    getSeriesWithFallback(defA.symbol, "2y"),
    getSeriesWithFallback(defB.symbol, "2y"),
  ]);

  const aligned = alignByDate(seriesA.bars, seriesB.bars);
  if (aligned.length < 30) return null;

  const pricesA = aligned.map((p) => p.a);
  const pricesB = aligned.map((p) => p.b);
  const indexed = indexTo100(aligned);

  const cointegration = testCointegration(pricesA, pricesB);
  const spread = cointegration.spread;
  const zScoreSeries = rollingZScore(spread, ROLLING_WINDOW);
  const rollingCorr = rollingCorrelation(pricesA, pricesB, ROLLING_WINDOW);

  const series: PairDetailPoint[] = indexed.map((p, i) => ({
    date: p.date,
    aIndexed: p.aIndexed,
    bIndexed: p.bIndexed,
    spread: spread[i] ?? 0,
    zScore: zScoreSeries[i],
    rollingCorrelation: rollingCorr[i],
  }));

  const regression = olsRegression(pricesA, pricesB);
  const scatter = pricesB.map((x, i) => ({ x, y: pricesA[i] }));
  const xMin = Math.min(...pricesB);
  const xMax = Math.max(...pricesB);
  const regressionLine = [
    { x: xMin, y: regression.alpha + regression.beta * xMin },
    { x: xMax, y: regression.alpha + regression.beta * xMax },
  ];

  const stdSpread = stddev(spread);
  const residualHistogram = histogram(spread, 20);
  const residualDistribution = residualHistogram.map((bin) => {
    const x = (bin.binStart + bin.binEnd) / 2;
    return { x, density: normalPdf(x, mean(spread), stdSpread) };
  });

  const returnsA = logReturns(pricesA);
  const returnsB = logReturns(pricesB);
  const returnsBeta = returnsB.length > 1 ? olsRegression(returnsA, returnsB).beta : null;

  const halfLifeDays = estimateHalfLife(spread);

  // Rolling cointegration & rolling beta: recompute over a trailing window,
  // subsampled every ROLLING_STEP days (this is a diagnostic history chart,
  // not a trading signal, so coarser resolution keeps it fast and the
  // payload small).
  const rollingCointegration: { date: string; pValue: number }[] = [];
  const rollingBeta: { date: string; beta: number }[] = [];
  const window = 100;
  for (let i = window; i < aligned.length; i += ROLLING_STEP) {
    const windowA = pricesA.slice(i - window, i);
    const windowB = pricesB.slice(i - window, i);
    const windowCointegration = testCointegration(windowA, windowB);
    rollingCointegration.push({ date: aligned[i].date, pValue: windowCointegration.pValueApprox });
    rollingBeta.push({ date: aligned[i].date, beta: windowCointegration.hedgeRatio });
  }

  // Mean reversion forecast: project the OU exponential decay of the current
  // spread back toward its historical mean over the next 30 days, using the
  // estimated half-life (flat projection at the current spread if the pair
  // isn't mean-reverting).
  const currentSpread = spread.at(-1) ?? 0;
  const meanSpread = mean(spread);
  const meanReversionForecast: { day: number; projected: number }[] = [];
  for (let day = 0; day <= 30; day++) {
    if (halfLifeDays) {
      const decay = Math.pow(0.5, day / halfLifeDays);
      meanReversionForecast.push({ day, projected: meanSpread + (currentSpread - meanSpread) * decay });
    } else {
      meanReversionForecast.push({ day, projected: currentSpread });
    }
  }

  const spreadChanges: number[] = [];
  for (let i = 1; i < spread.length; i++) spreadChanges.push(spread[i] - spread[i - 1]);
  const changeStd = stddev(spreadChanges);
  const sharpeRatio = changeStd > 0 ? (mean(spreadChanges) / changeStd) * Math.sqrt(252) : null;

  const winProbability = computeWinProbability(
    zScoreSeries,
    DEFAULT_THRESHOLDS.entry,
    DEFAULT_THRESHOLDS.exit,
    Math.max(20, Math.round((halfLifeDays ?? 20) * 3)),
  );
  const tradeConfidence = Math.min(Math.max(1 - cointegration.pValueApprox, 0), 1);

  return {
    symbolA: defA.symbol,
    nameA: defA.name,
    symbolB: defB.symbol,
    nameB: defB.name,
    hedgeRatio: cointegration.hedgeRatio,
    returnsBeta,
    cointegrationPValue: cointegration.pValueApprox,
    adfStatistic: cointegration.adfStatistic,
    isCointegrated: cointegration.isCointegrated,
    halfLifeDays,
    series,
    scatter,
    regressionLine,
    residualHistogram,
    residualDistribution,
    rollingCointegration,
    rollingBeta,
    meanReversionForecast,
    sharpeRatio,
    winProbability,
    tradeConfidence,
  };
}
