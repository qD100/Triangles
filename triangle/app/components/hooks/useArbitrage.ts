"use client";

import { useEffect, useRef, useState } from "react";

export type ArbitrageEvent = {
  id: string;
  time: string;
  path: string;
  route: string[];
  profit: number;
  live: boolean;
};

type GlowType = "none" | "base" | "route";

export type ScanStatus = {
  scanned: number;
  total: number;
};

export type ScannerSettings = {
  feePercent: number;
  minProfitPercent: number;
};

// Retained server-side too (same cap) — this is now how much history a
// fresh connection catches up on, not just how much we render.
const MAX_EVENTS = 500;

type IncomingMessage =
  | (ArbitrageEvent & { type: "arbitrage" })
  | {
      type: "status";
      time: string;
      scanned_pairs: number;
      total_pairs: number;
      fee_percent: number;
      min_profit_percent: number;
    }
  | {
      type: "settings";
      fee_percent: number;
      min_profit_percent: number;
    }
  | {
      type: "init";
      started_at: number;
      events: ArbitrageEvent[];
      best_profit: number;
    };

export default function useArbitrage() {
  const socket = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);

  const [currentRoute, setCurrentRoute] =
    useState<ArbitrageEvent | null>(null);

  const [scannerEvents, setScannerEvents] = useState<ArbitrageEvent[]>([]);

  const [temporaryCoin, setTemporaryCoin] = useState<string | null>(null);

  const [glowStates, setGlowStates] = useState<
    Record<string, GlowType>
  >({});

  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    scanned: 0,
    total: 0,
  });

  const [settings, setSettings] = useState<ScannerSettings>({
    feePercent: 0.1,
    minProfitPercent: 0.05,
  });

  // Origin for the uptime clock — the backend's own start time, not this
  // page's mount time, so a refresh shows the engine's true uptime instead
  // of resetting to zero.
  const [serverStartedAt, setServerStartedAt] = useState<number | null>(null);

  const [statistics, setStatistics] = useState({
    totalDetected: 0,
    bestProfit: 0,
    liveRoutes: 0,
    latency: 0,
  });

  function connect() {
    const wsUrl =
      process.env.NEXT_PUBLIC_ARBITRAGE_WS_URL ??
      "ws://localhost:8000/ws/arbitrage";

    socket.current = new WebSocket(wsUrl);

    socket.current.onopen = () => {
      console.log("✅ Arbitrage websocket connected");
      setConnected(true);
    };

    socket.current.onclose = () => {
      console.log("Disconnected from backend");

      setConnected(false);

      setTimeout(connect, 2000);
    };

    socket.current.onerror = () => {
      console.log("Websocket error");
    };

    socket.current.onmessage = (message) => {
      const start = performance.now();

      const data: IncomingMessage = JSON.parse(message.data);

      if (data.type === "init") {
        setServerStartedAt(data.started_at);
        setScannerEvents(data.events.slice(0, MAX_EVENTS));
        setStatistics((previous) => ({
          ...previous,
          bestProfit: data.best_profit,
        }));

        return;
      }

      if (data.type === "settings") {
        setSettings({
          feePercent: data.fee_percent,
          minProfitPercent: data.min_profit_percent,
        });

        return;
      }

      if (data.type === "status") {
        setScanStatus({
          scanned: data.scanned_pairs,
          total: data.total_pairs,
        });

        setSettings({
          feePercent: data.fee_percent,
          minProfitPercent: data.min_profit_percent,
        });

        return;
      }

      setCurrentRoute(data);

      setScannerEvents((previous) => [
        data,
        ...previous.slice(0, MAX_EVENTS - 1),
      ]);

      animateGlow(data.route);

      if (data.route.length >= 2) {
        setTemporaryCoin(data.route[1]);
      }

      setStatistics((previous) => ({
        totalDetected: previous.totalDetected + 1,

        bestProfit: Math.max(previous.bestProfit, data.profit),

        liveRoutes: previous.liveRoutes + 1,

        latency: Math.round(performance.now() - start),
      }));

      setTimeout(() => {
        setTemporaryCoin(null);
      }, 2500);
    };
  }

  function animateGlow(route: string[]) {
    setGlowStates({});

    route.forEach((coin, index) => {
      setTimeout(() => {
        setGlowStates((previous) => ({
          ...previous,

          [coin]:
            coin === "USDT"
              ? "base"
              : "route",
        }));
      }, index * 250);

      setTimeout(() => {
        setGlowStates((previous) => ({
          ...previous,

          [coin]: "none",
        }));
      }, index * 250 + 1000);
    });
  }

  function updateSettings(next: ScannerSettings) {
    setSettings(next);

    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          type: "settings",
          fee_percent: next.feePercent,
          min_profit_percent: next.minProfitPercent,
        })
      );
    }
  }

  useEffect(() => {
    connect();

    return () => {
      socket.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connected,

    currentRoute,

    scannerEvents,

    glowStates,

    temporaryCoin,

    statistics,

    scanStatus,

    settings,

    serverStartedAt,

    updateSettings,
  };
}
