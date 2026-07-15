export type OptionsTier = {
  id: string;
  number: number;
  name: string;
  scanners: string[];
  description: string;
  href: string;
};

// Adding a new tier is just appending one entry here — the hub grid and
// each tier's placeholder page both render straight from this list.
export const OPTIONS_TIERS: OptionsTier[] = [
  {
    id: "tier1",
    number: 1,
    name: "Core Arbitrage",
    scanners: ["Put-Call Parity", "Box Spread"],
    description: "Guaranteed no-arbitrage pricing relationships.",
    href: "/options-arbitrage/tier1",
  },
  {
    id: "tier2",
    number: 2,
    name: "Synthetic Arbitrage",
    scanners: ["Conversion", "Reverse Conversion"],
    description: "Synthetic vs actual asset pricing.",
    href: "/options-arbitrage/tier2",
  },
  {
    id: "tier3",
    number: 3,
    name: "Option Chain Consistency",
    scanners: ["Convexity", "Butterfly Arbitrage"],
    description: "Detect inconsistencies across option strikes.",
    href: "/options-arbitrage/tier3",
  },
  {
    id: "tier4",
    number: 4,
    name: "Time & Pricing Constraints",
    scanners: ["Calendar Arbitrage", "Pricing Bounds"],
    description: "Expiry consistency and theoretical option limits.",
    href: "/options-arbitrage/tier4",
  },
];
