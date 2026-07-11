"use client";

import { useEffect, useState } from "react";

const REFRESH_MS = 5 * 60 * 1000;

export type MarketQuote = {
  market_cap: number;
  price: number;
  percent_change_24h: number;
};

export default function useMarketCaps() {
  const [marketCaps, setMarketCaps] = useState<Record<string, MarketQuote>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/market-caps");
        const data = await response.json();

        if (!cancelled) setMarketCaps(data);
      } catch {
        // keep previous values on failure
      }
    }

    load();

    const interval = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return marketCaps;
}
