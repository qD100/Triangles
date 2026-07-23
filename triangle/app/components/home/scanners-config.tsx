import type { ComponentType } from "react";
import {
  TriangleLogoIcon,
  SwapIcon,
  OptionsIcon,
  TrendIcon,
  BarsIcon,
  GridIcon,
} from "../icons";
import { resolveSpotFuturesRoute } from "../ArbitrageLauncher";
import { ETF_UNIVERSE, STOCK_UNIVERSE } from "@/lib/tasi/universe";

export type ScannerAccent = {
  text: string;
  bg: string;
  bgSoft: string;
  border: string;
  glow: string;
  dot: string;
  hoverBorder: string;
  hoverBgSoft: string;
};

// One literal Tailwind class string per slot, per accent — written out in
// full (including variant prefixes like `hover:`) so Tailwind's static
// scanner can find them. Building a class string like `hover:${accent.bg}`
// at runtime would never generate the CSS, since Tailwind only picks up
// complete literal tokens from source text, not runtime concatenations.
export const ACCENTS = {
  green: {
    text: "text-[#18D26E]",
    bg: "bg-[#18D26E]",
    bgSoft: "bg-[#18D26E]/10",
    border: "border-[#18D26E]/30",
    glow: "shadow-[0_0_32px_-8px_#18D26E]",
    dot: "bg-[#18D26E]",
    hoverBorder: "hover:border-[#18D26E]/30",
    hoverBgSoft: "hover:bg-[#18D26E]/10",
  },
  purple: {
    text: "text-[#8B5CF6]",
    bg: "bg-[#8B5CF6]",
    bgSoft: "bg-[#8B5CF6]/10",
    border: "border-[#8B5CF6]/30",
    glow: "shadow-[0_0_32px_-8px_#8B5CF6]",
    dot: "bg-[#8B5CF6]",
    hoverBorder: "hover:border-[#8B5CF6]/30",
    hoverBgSoft: "hover:bg-[#8B5CF6]/10",
  },
  orange: {
    text: "text-[#F5A623]",
    bg: "bg-[#F5A623]",
    bgSoft: "bg-[#F5A623]/10",
    border: "border-[#F5A623]/30",
    glow: "shadow-[0_0_32px_-8px_#F5A623]",
    dot: "bg-[#F5A623]",
    hoverBorder: "hover:border-[#F5A623]/30",
    hoverBgSoft: "hover:bg-[#F5A623]/10",
  },
  blue: {
    text: "text-[#2F80FF]",
    bg: "bg-[#2F80FF]",
    bgSoft: "bg-[#2F80FF]/10",
    border: "border-[#2F80FF]/30",
    glow: "shadow-[0_0_32px_-8px_#2F80FF]",
    dot: "bg-[#2F80FF]",
    hoverBorder: "hover:border-[#2F80FF]/30",
    hoverBgSoft: "hover:bg-[#2F80FF]/10",
  },
  teal: {
    text: "text-[#14B8A6]",
    bg: "bg-[#14B8A6]",
    bgSoft: "bg-[#14B8A6]/10",
    border: "border-[#14B8A6]/30",
    glow: "shadow-[0_0_32px_-8px_#14B8A6]",
    dot: "bg-[#14B8A6]",
    hoverBorder: "hover:border-[#14B8A6]/30",
    hoverBgSoft: "hover:bg-[#14B8A6]/10",
  },
  gold: {
    text: "text-[#EAB308]",
    bg: "bg-[#EAB308]",
    bgSoft: "bg-[#EAB308]/10",
    border: "border-[#EAB308]/30",
    glow: "shadow-[0_0_32px_-8px_#EAB308]",
    dot: "bg-[#EAB308]",
    hoverBorder: "hover:border-[#EAB308]/30",
    hoverBgSoft: "hover:bg-[#EAB308]/10",
  },
} as const satisfies Record<string, ScannerAccent>;

export type AccentKey = keyof typeof ACCENTS;

export type HomeScanner = {
  id: string;
  title: string;
  badge?: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: AccentKey;
  route: string | (() => string);
  scanningLabel: string;
};

const pairCount = (STOCK_UNIVERSE.length * (STOCK_UNIVERSE.length - 1)) / 2;

export const HOME_SCANNERS: HomeScanner[] = [
  {
    id: "triangular",
    title: "Triangular Arbitrage",
    description: "Find inefficiencies across crypto trading pairs.",
    icon: TriangleLogoIcon,
    accent: "green",
    route: "/triangular-arbitrage",
    scanningLabel: "Scanning live pairs",
  },
  {
    id: "spot-futures",
    title: "Spot-Future Arbitrage",
    description: "Detect mispricings between spot and futures markets.",
    icon: SwapIcon,
    accent: "purple",
    route: resolveSpotFuturesRoute,
    scanningLabel: "Scanning live markets",
  },
  {
    id: "options",
    title: "Options Arbitrage",
    badge: "BETA",
    description: "Identify opportunities in options contracts and strategies.",
    icon: OptionsIcon,
    accent: "orange",
    route: "/options-arbitrage",
    scanningLabel: "Scanning live contracts",
  },
  {
    id: "pairs",
    title: "Pairs Trading",
    description: "Find statistically correlated pairs with mean reversion potential.",
    icon: TrendIcon,
    accent: "blue",
    route: "/tasi?tab=pairs",
    scanningLabel: `Scanning ${pairCount} pairs`,
  },
  {
    id: "etf-tasi",
    title: "ETF vs TASI Index",
    description: "Detect mispricings between ETFs and the TASI index.",
    icon: BarsIcon,
    accent: "teal",
    route: "/tasi?tab=etf",
    scanningLabel: `Scanning ${ETF_UNIVERSE.length} ETFs`,
  },
  {
    id: "correlation",
    title: "Correlation Analytics",
    description: "Explore correlations, heatmaps and market relationships.",
    icon: GridIcon,
    accent: "gold",
    route: "/tasi?tab=analytics",
    scanningLabel: `${STOCK_UNIVERSE.length} instruments tracked`,
  },
];

export function resolveRoute(route: string | (() => string)): string {
  return typeof route === "function" ? route() : route;
}
