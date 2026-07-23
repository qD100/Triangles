import { getChart } from "./yahoo";
import { getSeriesWithFallback } from "./mock-data";
import { ETF_UNIVERSE, type EtfDefinition } from "./universe";
import { alignByDate, indexTo100, pctChange } from "./finance";
import { mean, stddev, histogram, normalPdf, type HistogramBin } from "./statistics";
import { multiWindowZScore } from "./zscore";
import { pearsonCorrelation } from "./correlation";
import { estimateHalfLife } from "./halfLife";
import { classifyEtfSignal, computeOpportunityScore, type EtfSignal } from "./opportunityScore";

export interface EtfSeriesPoint {
  date: string;
  etfIndexed: number;
  benchmarkIndexed: number;
  premium: number;
  zScore20: number | null;
  zScore50: number | null;
  zScore100: number | null;
}

export interface EtfScannerRow {
  symbol: string;
  name: string;
  benchmarkSymbol: string;
  benchmarkName: string;
  currency: string;
  etfPrice: number | null;
  nav: number | null;
  hasLiveNav: boolean;
  premiumAbs: number | null;
  premiumPct: number | null;
  historicalMeanPremium: number;
  historicalStdPremium: number;
  currentTrackingPremium: number | null;
  zScoreWindow: number;
  currentZScore: number | null;
  fairValue: number | null;
  expectedReversionPrice: number | null;
  deviationFromFairValuePct: number | null;
  signal: EtfSignal;
  opportunityScore: number;
  signalConfidence: number;
  daysAbove2Sigma: number;
  daysBelow2Sigma: number;
  halfLifeDays: number | null;
  isSimulated: boolean;
  series: EtfSeriesPoint[];
  histogramBins: HistogramBin[];
  distributionCurve: { x: number; density: number }[];
  weeklyHeatmap: { weekLabel: string; value: number }[];
  meanReversionForecast: { day: number; projected: number }[];
}

export interface EtfScannerResult {
  updatedAt: string;
  rows: EtfScannerRow[];
  warnings: string[];
}

const Z_SIGNAL_WINDOW = 20; // which rolling window drives the signal/score

function weeklyBuckets(series: EtfSeriesPoint[]): { weekLabel: string; value: number }[] {
  const buckets = new Map<string, number[]>();
  for (const point of series) {
    const d = new Date(point.date);
    // ISO week bucket key: year + week number (Sun-Thu Tadawul calendar
    // doesn't change ISO week math, we just need a stable weekly grouping).
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${week}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(point.premium);
  }
  return Array.from(buckets.entries())
    .slice(-26)
    .map(([weekLabel, values]) => ({ weekLabel, value: mean(values) }));
}

async function buildEtfRow(def: EtfDefinition): Promise<EtfScannerRow> {
  const [etfSeries, benchmarkSeries, ivChart] = await Promise.all([
    getSeriesWithFallback(def.symbol, "2y"),
    getSeriesWithFallback(def.benchmarkSymbol, "2y"),
    def.ivSymbol
      ? getChart(def.ivSymbol, "1d").catch(() => null)
      : Promise.resolve(null),
  ]);

  const aligned = alignByDate(etfSeries.bars, benchmarkSeries.bars);
  const indexed = indexTo100(aligned);

  const premiumRaw = indexed.map((p) => p.aIndexed - p.bIndexed);
  const zScores = multiWindowZScore(premiumRaw);

  const series: EtfSeriesPoint[] = indexed.map((p, i) => ({
    date: p.date,
    etfIndexed: p.aIndexed,
    benchmarkIndexed: p.bIndexed,
    premium: premiumRaw[i],
    zScore20: zScores[20][i],
    zScore50: zScores[50][i],
    zScore100: zScores[100][i],
  }));

  const historicalMeanPremium = mean(premiumRaw);
  const historicalStdPremium = stddev(premiumRaw);
  const currentTrackingPremium = premiumRaw.at(-1) ?? null;
  const currentZScore = zScores[Z_SIGNAL_WINDOW].at(-1) ?? null;

  const nav = ivChart?.price ?? null;
  const hasLiveNav = nav !== null;
  const etfPrice = etfSeries.price;
  const premiumAbs = hasLiveNav ? etfPrice - (nav as number) : null;
  const premiumPct = hasLiveNav ? pctChange(etfPrice, nav) : null;

  // Fair value: the ETF price level that would bring tracking premium back
  // to its historical mean, holding the benchmark's current indexed level
  // fixed. Derived from the same indexed-to-100 basis as the premium series.
  const lastIndexed = indexed.at(-1);
  const baseEtfPrice = aligned.length > 0 ? aligned[0].a : null;
  let fairValue: number | null = null;
  let expectedReversionPrice: number | null = null;
  if (lastIndexed && baseEtfPrice) {
    const fairIndexed = lastIndexed.bIndexed + historicalMeanPremium;
    fairValue = (fairIndexed / 100) * baseEtfPrice;
    expectedReversionPrice = fairValue;
  }
  const deviationFromFairValuePct =
    fairValue !== null ? pctChange(etfPrice, fairValue) : null;

  const returnsCorrelation = pearsonCorrelation(
    aligned.map((p) => p.a),
    aligned.map((p) => p.b),
  );
  const signalConfidence = Math.min(Math.max(returnsCorrelation ?? 0, 0), 1);

  const halfLifeDays = estimateHalfLife(premiumRaw);

  const daysAbove2Sigma = zScores[Z_SIGNAL_WINDOW].filter((z) => z !== null && z > 2).length;
  const daysBelow2Sigma = zScores[Z_SIGNAL_WINDOW].filter((z) => z !== null && z < -2).length;

  const signal = classifyEtfSignal(currentZScore);
  const opportunityScore = computeOpportunityScore({
    zScore: currentZScore,
    confidence: signalConfidence,
    halfLifeDays,
  });

  const deviations = premiumRaw.map((p) => p - historicalMeanPremium);
  const histogramBins = histogram(deviations, 20);
  const distributionCurve = histogramBins.map((bin) => {
    const x = (bin.binStart + bin.binEnd) / 2;
    return { x, density: normalPdf(x, 0, historicalStdPremium) };
  });

  // OU-decay projection of the current tracking premium back toward its
  // historical mean over the next 30 days (flat if not mean-reverting).
  const meanReversionForecast: { day: number; projected: number }[] = [];
  for (let day = 0; day <= 30; day++) {
    if (halfLifeDays && currentTrackingPremium !== null) {
      const decay = Math.pow(0.5, day / halfLifeDays);
      meanReversionForecast.push({
        day,
        projected: historicalMeanPremium + (currentTrackingPremium - historicalMeanPremium) * decay,
      });
    } else {
      meanReversionForecast.push({ day, projected: currentTrackingPremium ?? historicalMeanPremium });
    }
  }

  return {
    symbol: def.symbol,
    name: def.name,
    benchmarkSymbol: def.benchmarkSymbol,
    benchmarkName: def.benchmarkName,
    currency: def.currency,
    etfPrice,
    nav,
    hasLiveNav,
    premiumAbs,
    premiumPct,
    historicalMeanPremium,
    historicalStdPremium,
    currentTrackingPremium,
    zScoreWindow: Z_SIGNAL_WINDOW,
    currentZScore,
    fairValue,
    expectedReversionPrice,
    deviationFromFairValuePct,
    signal,
    opportunityScore,
    signalConfidence,
    daysAbove2Sigma,
    daysBelow2Sigma,
    halfLifeDays,
    isSimulated: etfSeries.isSimulated || benchmarkSeries.isSimulated,
    series,
    histogramBins,
    distributionCurve,
    weeklyHeatmap: weeklyBuckets(series),
    meanReversionForecast,
  };
}

export async function getEtfScannerData(): Promise<EtfScannerResult> {
  const warnings: string[] = [];
  const settled = await Promise.allSettled(ETF_UNIVERSE.map(buildEtfRow));

  const rows: EtfScannerRow[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      rows.push(result.value);
      if (result.value.isSimulated) {
        warnings.push(`${ETF_UNIVERSE[i].symbol}: live data unavailable, showing simulated series.`);
      }
    } else {
      warnings.push(`${ETF_UNIVERSE[i].symbol}: failed to load entirely.`);
    }
  });

  if (rows.some((r) => !r.hasLiveNav)) {
    warnings.push(
      "Some ETFs have no published intraday indicative value on Yahoo — premium/discount to NAV is unavailable for those (tracking-proxy chart still applies).",
    );
  }

  return { updatedAt: new Date().toISOString(), rows, warnings };
}
