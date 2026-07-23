"use client";

import { useEffect, useState } from "react";
import { STOCK_UNIVERSE, ETF_UNIVERSE } from "@/lib/tasi/universe";
import { classifyPairSignal, classifyEtfSignal } from "@/lib/tasi/opportunityScore";
import type {
  DashboardSnapshot,
  TriangularSnapshot,
  SpotFutureSnapshot,
  OptionsSnapshot,
  PairsSnapshot,
  EtfSnapshot,
  CorrelationSnapshot,
  CorrelationCellState,
  Direction,
} from "./types";

// Real facts pulled from the actual universe files used by the live /tasi
// scanners — not invented. Only the moment-to-moment fluctuating numbers
// below are simulated pending a real streaming backend.
const PAIR_A = STOCK_UNIVERSE.find((s) => s.symbol === "1120.SR")!;
const PAIR_B = STOCK_UNIVERSE.find((s) => s.symbol === "1180.SR")!;
const PAIRS_TRACKED = (STOCK_UNIVERSE.length * (STOCK_UNIVERSE.length - 1)) / 2;
const ETF = ETF_UNIVERSE[0];

// [anchor, legA, legB] — a closed triangular cycle: anchor -> legA -> legB -> anchor.
const ROUTE_POOL: [string, string, string][] = [
  ["USDT", "BTC", "ETH"],
  ["USDT", "ETH", "SOL"],
  ["USDT", "BNB", "SOL"],
  ["USDT", "BTC", "SOL"],
];

const STRATEGY_POOL = ["Box Spread", "Put-Call Parity", "Synthetic Conversion", "Calendar Spread"];

function jitterPct(value: number, amplitudePct: number) {
  return value * (1 + (Math.random() - 0.5) * 2 * amplitudePct);
}

function directionOf(next: number, prev: number): Direction {
  if (next > prev + 1e-9) return "up";
  if (next < prev - 1e-9) return "down";
  return "flat";
}

function every(tick: number, n: number) {
  return tick % n === 0;
}

function initSnapshot(): DashboardSnapshot {
  const now = Date.now();
  const zScore = -2.81;
  const cointegrationP = 0.01;

  const premiumPct = 0.48;

  return {
    triangular: {
      route: ROUTE_POOL[0],
      bestEdgePct: 0.42,
      edgeDirection: "flat",
      cyclesScanned: 48231,
      activeOpportunities: 7,
      updatedAt: now,
    },
    spotFuture: {
      symbol: "BTCUSDT",
      spot: 118532,
      future: 118914,
      basisPct: 0.32,
      basisDirection: "flat",
      fundingPct: 0.01,
      contracts: 986,
    },
    options: {
      symbol: "BTC Options",
      mispriced: 17,
      bestStrategy: STRATEGY_POOL[0],
      strategyChangedAt: now,
      expectedReturnPct: 0.58,
      contracts: 624,
    },
    pairs: {
      pairLabel: `${PAIR_A.symbol.replace(".SR", "")} / ${PAIR_B.symbol.replace(".SR", "")}`,
      pairSectors: `${PAIR_A.sector} · ${PAIR_B.sector}`,
      correlation: 0.82,
      cointegrationP,
      zScore,
      signal: classifyPairSignal(zScore, cointegrationP),
    },
    etf: {
      symbol: ETF.symbol,
      etfPrice: 12.43,
      indexNav: 12.37,
      premiumPct,
      premiumDirection: "flat",
      opportunityScore: 91,
      signal: classifyEtfSignal(premiumPct / 0.2),
    },
    correlation: {
      grid: initCorrelationGrid(),
      pairsTracked: PAIRS_TRACKED,
      strongCorrelations: 124,
      cointegratedCount: 71,
    },
  };
}

const GRID_SIZE = 40;

function initCorrelationGrid(): CorrelationCellState[] {
  const grid: CorrelationCellState[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const r = Math.random();
    grid.push(r < 0.55 ? "normal" : r < 0.8 ? "high" : r < 0.93 ? "weak" : "breaking");
  }
  return grid;
}

function advanceTriangular(prev: TriangularSnapshot, tick: number): TriangularSnapshot {
  const cyclesScanned = prev.cyclesScanned + Math.round(80 + Math.random() * 160);

  if (!every(tick, 3)) {
    return { ...prev, cyclesScanned };
  }

  const bestEdgePct = Math.max(0.05, jitterPct(prev.bestEdgePct, 0.35));
  return {
    route: Math.random() < 0.2 ? ROUTE_POOL[Math.floor(Math.random() * ROUTE_POOL.length)] : prev.route,
    bestEdgePct,
    edgeDirection: directionOf(bestEdgePct, prev.bestEdgePct),
    cyclesScanned,
    activeOpportunities: Math.max(1, Math.round(jitterPct(prev.activeOpportunities, 0.3))),
    updatedAt: Date.now(),
  };
}

function advanceSpotFuture(prev: SpotFutureSnapshot, tick: number): SpotFutureSnapshot {
  const spot = jitterPct(prev.spot, 0.0015);
  const future = jitterPct(prev.future, 0.0015);
  const basisPct = ((future - spot) / spot) * 100;

  return {
    ...prev,
    spot,
    future,
    basisPct,
    basisDirection: directionOf(basisPct, prev.basisPct),
    fundingPct: every(tick, 4) ? Math.max(0, jitterPct(prev.fundingPct, 0.2)) : prev.fundingPct,
    contracts: every(tick, 4) ? Math.max(1, Math.round(jitterPct(prev.contracts, 0.05))) : prev.contracts,
  };
}

function advanceOptions(prev: OptionsSnapshot, tick: number): OptionsSnapshot {
  if (!every(tick, 3)) return prev;

  const strategyChanges = Math.random() < 0.1;
  const bestStrategy = strategyChanges
    ? STRATEGY_POOL[Math.floor(Math.random() * STRATEGY_POOL.length)]
    : prev.bestStrategy;

  return {
    ...prev,
    mispriced: Math.max(1, Math.round(jitterPct(prev.mispriced, 0.4))),
    bestStrategy,
    strategyChangedAt: strategyChanges ? Date.now() : prev.strategyChangedAt,
    expectedReturnPct: Math.max(0.05, jitterPct(prev.expectedReturnPct, 0.3)),
    contracts: Math.max(1, Math.round(jitterPct(prev.contracts, 0.08))),
  };
}

function advancePairs(prev: PairsSnapshot, tick: number): PairsSnapshot {
  if (!every(tick, 3)) return prev;

  const zScore = Math.max(-4, Math.min(4, prev.zScore + (Math.random() - 0.5) * 0.4));
  const cointegrationP = Math.max(0.001, Math.min(0.2, jitterPct(prev.cointegrationP, 0.3)));

  return {
    ...prev,
    correlation: Math.max(0.4, Math.min(0.97, jitterPct(prev.correlation, 0.05))),
    cointegrationP,
    zScore,
    signal: classifyPairSignal(zScore, cointegrationP),
  };
}

function advanceEtf(prev: EtfSnapshot, tick: number): EtfSnapshot {
  if (!every(tick, 3)) return prev;

  const etfPrice = jitterPct(prev.etfPrice, 0.01);
  const indexNav = jitterPct(prev.indexNav, 0.006);
  const premiumPct = ((etfPrice - indexNav) / indexNav) * 100;

  return {
    ...prev,
    etfPrice,
    indexNav,
    premiumPct,
    premiumDirection: directionOf(premiumPct, prev.premiumPct),
    opportunityScore: Math.max(10, Math.min(99, Math.round(jitterPct(prev.opportunityScore, 0.05)))),
    signal: classifyEtfSignal(premiumPct / 0.2),
  };
}

function advanceCorrelation(prev: CorrelationSnapshot, tick: number): CorrelationSnapshot {
  if (!every(tick, 2)) return prev;

  const states: CorrelationCellState[] = ["normal", "high", "weak", "breaking"];
  const grid = prev.grid.map((cell) => {
    if (Math.random() > 0.08) return cell;
    return states[Math.floor(Math.random() * states.length)];
  });

  const highFraction = grid.filter((c) => c === "high").length / grid.length;
  const breakingOrWeakFraction = grid.filter((c) => c === "weak" || c === "breaking").length / grid.length;

  return {
    ...prev,
    grid,
    strongCorrelations: Math.round(highFraction * prev.pairsTracked),
    cointegratedCount: Math.round((1 - breakingOrWeakFraction) * prev.pairsTracked * 0.16),
  };
}

// A mock provider standing in for a real streaming backend. It ticks every
// second (satisfying "live"), but individual fields only mutate on a
// realistic cadence per data type (crypto prices move nearly every tick;
// equity-derived stats like correlation/z-score every ~3rd tick) — so
// unchanged slices keep the same object reference between renders, which is
// what lets each memoized mini-dashboard skip re-rendering on ticks that
// didn't actually touch it. Swapping this hook for a real websocket/query
// later requires no change downstream: every consumer only depends on the
// DashboardSnapshot shape.
export function useDashboardSnapshot(): DashboardSnapshot {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initSnapshot);

  useEffect(() => {
    let tick = 0;

    const id = setInterval(() => {
      tick += 1;
      setSnapshot((prev) => ({
        triangular: advanceTriangular(prev.triangular, tick),
        spotFuture: advanceSpotFuture(prev.spotFuture, tick),
        options: advanceOptions(prev.options, tick),
        pairs: advancePairs(prev.pairs, tick),
        etf: advanceEtf(prev.etf, tick),
        correlation: advanceCorrelation(prev.correlation, tick),
      }));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return snapshot;
}
