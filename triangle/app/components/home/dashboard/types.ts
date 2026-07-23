import type { PairSignal, EtfSignal } from "@/lib/tasi/opportunityScore";

export type Direction = "up" | "down" | "flat";

export interface TriangularSnapshot {
  route: [string, string, string];
  bestEdgePct: number;
  edgeDirection: Direction;
  cyclesScanned: number;
  activeOpportunities: number;
  updatedAt: number;
}

export interface SpotFutureSnapshot {
  symbol: string;
  spot: number;
  future: number;
  basisPct: number;
  basisDirection: Direction;
  fundingPct: number;
  contracts: number;
}

export interface OptionsSnapshot {
  symbol: string;
  mispriced: number;
  bestStrategy: string;
  strategyChangedAt: number;
  expectedReturnPct: number;
  contracts: number;
}

export interface PairsSnapshot {
  pairLabel: string;
  pairSectors: string;
  correlation: number;
  cointegrationP: number;
  zScore: number;
  signal: PairSignal;
}

export interface EtfSnapshot {
  symbol: string;
  etfPrice: number;
  indexNav: number;
  premiumPct: number;
  premiumDirection: Direction;
  opportunityScore: number;
  signal: EtfSignal;
}

export type CorrelationCellState = "normal" | "high" | "weak" | "breaking";

export interface CorrelationSnapshot {
  grid: CorrelationCellState[];
  pairsTracked: number;
  strongCorrelations: number;
  cointegratedCount: number;
}

// The single shape every mini-dashboard reads from. Swapping the mock
// provider (useDashboardSnapshot) for a real backend feed later only means
// producing this same interface from a websocket/query instead — nothing
// downstream (the six mini-dashboard components) needs to change.
export interface DashboardSnapshot {
  triangular: TriangularSnapshot;
  spotFuture: SpotFutureSnapshot;
  options: OptionsSnapshot;
  pairs: PairsSnapshot;
  etf: EtfSnapshot;
  correlation: CorrelationSnapshot;
}
