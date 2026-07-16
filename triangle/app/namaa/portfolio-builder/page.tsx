import { readFile } from "node:fs/promises";
import path from "node:path";

import { PortfolioBuilderApp } from "@/components/portfolio-builder/PortfolioBuilderApp";
import { alignPriceSeries } from "@/lib/portfolio-builder/align";
import {
  DATA_END_DATE,
  DATA_START_DATE,
  DEFAULT_RISK_FREE_RATE,
  ETF_SYMBOLS,
  ROLLING_VOL_WINDOW_DAYS,
} from "@/lib/portfolio-builder/constants";
import { parseEtfCsv } from "@/lib/portfolio-builder/csv";
import {
  annualizedReturn,
  annualizedVolatility,
  assignRiskTiers,
  correlationMatrix,
  covarianceMatrix,
  growthOfInvestment,
  maxDrawdown,
  rollingVolatility,
  sharpeRatio,
  stdev,
} from "@/lib/portfolio-builder/finance";
import type {
  AnalyticsBundle,
  EtfStats,
  EtfSymbol,
  PricePoint,
} from "@/lib/portfolio-builder/types";

const FILE_BY_SYMBOL: Record<EtfSymbol, string> = {
  SPY: "SPY.csv",
  VXUS: "VXUS.csv",
  BIL: "BIL.csv",
  GLD: "GLD.csv",
  VNQ: "VNQ.csv",
};

async function loadAnalyticsBundle(): Promise<AnalyticsBundle> {
  const dataDir = path.join(process.cwd(), "app", "namaa", "mrktdata");

  const seriesEntries = await Promise.all(
    ETF_SYMBOLS.map(async (symbol) => {
      const raw = await readFile(path.join(dataDir, FILE_BY_SYMBOL[symbol]), "utf-8");
      return [symbol, parseEtfCsv(raw)] as const;
    })
  );
  const seriesBySymbol = Object.fromEntries(seriesEntries) as Record<
    EtfSymbol,
    PricePoint[]
  >;

  const aligned = alignPriceSeries(seriesBySymbol, ETF_SYMBOLS, {
    start: DATA_START_DATE,
    end: DATA_END_DATE,
  });

  const volBySymbol = {} as Record<EtfSymbol, number>;
  const growth10k = {} as Record<EtfSymbol, number[]>;
  const rollingVol = {} as Record<EtfSymbol, Array<number | null>>;
  const statsBySymbol = {} as Record<EtfSymbol, EtfStats>;

  for (const symbol of ETF_SYMBOLS) {
    const prices = aligned.pricesBySymbol[symbol];
    const returns = aligned.returnsBySymbol[symbol];
    const dailyVol = stdev(returns);
    const annVol = annualizedVolatility(dailyVol);
    const annReturn = annualizedReturn(prices, aligned.dates);

    volBySymbol[symbol] = annVol;
    growth10k[symbol] = growthOfInvestment(returns);
    rollingVol[symbol] = rollingVolatility(returns, ROLLING_VOL_WINDOW_DAYS);
    statsBySymbol[symbol] = {
      symbol,
      annualizedReturn: annReturn,
      dailyVolatility: dailyVol,
      annualizedVolatility: annVol,
      maxDrawdown: maxDrawdown(prices),
      sharpeRatio: sharpeRatio(annReturn, annVol, DEFAULT_RISK_FREE_RATE),
      volatilityRank: 0,
      riskTier: "warning",
    };
  }

  const tiers = assignRiskTiers(volBySymbol, ETF_SYMBOLS);
  for (const symbol of ETF_SYMBOLS) {
    statsBySymbol[symbol].volatilityRank = tiers[symbol].rank;
    statsBySymbol[symbol].riskTier = tiers[symbol].tier;
  }

  return {
    symbols: ETF_SYMBOLS,
    dates: aligned.dates,
    dailyReturns: aligned.returnsBySymbol,
    growth10k,
    rollingVolatility: rollingVol,
    stats: statsBySymbol,
    correlationMatrix: correlationMatrix(aligned.returnsBySymbol, ETF_SYMBOLS),
    covarianceMatrix: covarianceMatrix(aligned.returnsBySymbol, ETF_SYMBOLS),
    riskFreeRateDefault: DEFAULT_RISK_FREE_RATE,
    dataStartDate: aligned.dates[0],
    dataEndDate: aligned.dates[aligned.dates.length - 1],
  };
}

export default async function PortfolioBuilderPage() {
  const analytics = await loadAnalyticsBundle();
  return <PortfolioBuilderApp initialAnalytics={analytics} />;
}
