"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useMarketData from "./useMarketData";
import useArbitrage from "./useArbitrage";
import useMarketCaps from "./useMarketCaps";
import { initialCoins } from "@/app/data/initialCoins";

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function useTerminal() {
  const { coins: liveCoins, flashStates } = useMarketData(initialCoins);
  const arbitrage = useArbitrage();
  const marketCaps = useMarketCaps();

  const coins = useMemo(() => {
    const withMarketCaps = liveCoins.map((coin) => {
      const quote = marketCaps[coin.symbol.toUpperCase()];
      const hasLivePrice = coin.current_price > 0;

      return {
        ...coin,
        market_cap: quote?.market_cap ?? coin.market_cap,
        current_price: hasLivePrice
          ? coin.current_price
          : quote?.price ?? coin.current_price,
        price_change_percentage_24h: hasLivePrice
          ? coin.price_change_percentage_24h
          : quote?.percent_change_24h ?? coin.price_change_percentage_24h,
      };
    });

    return withMarketCaps
      .sort((a, b) => b.market_cap - a.market_cap)
      .map((coin, index) => ({
        ...coin,
        market_cap_rank: index + 1,
      }));
  }, [liveCoins, marketCaps]);

  const eventTimestamps = useRef<number[]>([]);
  const lastEventId = useRef<string | null>(null);

  const [opportunitiesPerMin, setOpportunitiesPerMin] = useState(0);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  useEffect(() => {
    const latest = arbitrage.scannerEvents[0];

    if (latest && latest.id !== lastEventId.current) {
      lastEventId.current = latest.id;
      eventTimestamps.current.push(Date.now());
    }
  }, [arbitrage.scannerEvents]);

  // Uptime is derived from the backend's own start time (received once over
  // the websocket), not this page's mount time — a refresh shows the
  // engine's true uptime instead of resetting to zero. serverStartedAt is
  // set once per server process lifetime, so this effect re-running when it
  // arrives (null -> real value) is the only time it ever changes.
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 60_000;

      eventTimestamps.current = eventTimestamps.current.filter(
        (timestamp) => timestamp > cutoff
      );

      setOpportunitiesPerMin(eventTimestamps.current.length);

      if (arbitrage.serverStartedAt !== null) {
        setUptimeSeconds(Math.floor((Date.now() - arbitrage.serverStartedAt) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [arbitrage.serverStartedAt]);

  const uptime = useMemo(() => formatDuration(uptimeSeconds), [uptimeSeconds]);

  const temporaryCoin = useMemo(() => {
    if (!arbitrage.temporaryCoin) return null;

    return (
      coins.find(
        (coin) =>
          coin.symbol.toUpperCase() ===
          arbitrage.temporaryCoin?.toUpperCase()
      ) ?? null
    );
  }, [coins, arbitrage.temporaryCoin]);

  const lastUpdate = arbitrage.scannerEvents[0]?.time ?? null;

  return {
    coins,
    flashStates,

    connected: arbitrage.connected,
    currentRoute: arbitrage.currentRoute,
    scannerEvents: arbitrage.scannerEvents,
    glowStates: arbitrage.glowStates,
    temporaryCoin,
    statistics: arbitrage.statistics,
    scanStatus: arbitrage.scanStatus,
    settings: arbitrage.settings,
    updateSettings: arbitrage.updateSettings,

    opportunitiesPerMin,
    uptime,
    lastUpdate,
  };
}
