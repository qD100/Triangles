"use client";

import { useEffect, useRef, useState } from "react";

export type OptionsOpportunity = {
  type: "opportunity";
  id: string;
  scanner: "core" | "box" | "synthetic" | "chain";
  algorithm: string;
  underlying: string;
  strikes: number[];
  expiries: number[];
  time: string;
  detected_at: number;
  formula: string;
  inputs: Record<string, number | string>;
  calculation: string;
  mispricing: number;
  expected_profit: number;
  roi_percent: number;
  confidence: "high" | "medium" | "low";
  suggested_trade: string;
};

export type MarketPanelData = {
  spot: number;
  expiries_count: number;
  contracts_count: number;
  strikes_count: number;
  calls_count: number;
  puts_count: number;
  last_update: string;
};

export type ScannerId = "core" | "box" | "synthetic" | "chain";

export type ScannerStatus = {
  status: "scanning" | "opportunity" | "no_opportunity";
  contracts_scanned: number;
  last_scan_time: string | null;
  opportunities_count: number;
};

export type PerformanceStats = {
  contracts_scanned_total: number;
  scans_per_sec: number;
  avg_scan_time_ms: number;
  last_update: string;
};

export type OptionsSettings = {
  fee_percent: number;
  min_profit_usd: number;
};

// Retained server-side too (same cap) — how much history a fresh
// connection catches up on, not just how much we render.
const MAX_EVENTS = 300;

type IncomingMessage =
  | OptionsOpportunity
  | {
      type: "status";
      time: string;
      market: Record<string, MarketPanelData>;
      scanners: Record<ScannerId, ScannerStatus>;
      performance: PerformanceStats;
    }
  | {
      type: "settings";
      fee_percent: number;
      min_profit_usd: number;
    }
  | {
      type: "init";
      started_at: number;
      events: OptionsOpportunity[];
      market: Record<string, MarketPanelData>;
      scanners: Record<ScannerId, ScannerStatus>;
      settings: OptionsSettings;
    };

export default function useOptionsScanner() {
  const socket = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [market, setMarket] = useState<Record<string, MarketPanelData>>({});
  const [scanners, setScanners] = useState<Record<string, ScannerStatus>>({});
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [opportunities, setOpportunities] = useState<OptionsOpportunity[]>([]);
  const [settings, setSettings] = useState<OptionsSettings>({ fee_percent: 0.05, min_profit_usd: 5 });

  // Origin for the uptime clock — the backend's own start time, not this
  // page's mount time, so a refresh shows the engine's true uptime instead
  // of resetting to zero.
  const [serverStartedAt, setServerStartedAt] = useState<number | null>(null);

  function connect() {
    const wsUrl =
      process.env.NEXT_PUBLIC_OPTIONS_WS_URL ??
      "ws://localhost:8000/ws/options";

    socket.current = new WebSocket(wsUrl);

    socket.current.onopen = () => {
      setConnected(true);
    };

    socket.current.onclose = () => {
      setConnected(false);
      setTimeout(connect, 2000);
    };

    socket.current.onerror = () => {
      // onclose fires right after and handles reconnection
    };

    socket.current.onmessage = (message) => {
      // A message arriving mid-redeploy (server restarting, connection torn
      // down mid-write) can be truncated or shaped unexpectedly — never let
      // that crash the whole tab. Worst case, this tick's update is skipped
      // and the next broadcast (a few seconds later) catches it up.
      let data: IncomingMessage;

      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }

      if (data.type === "init") {
        setServerStartedAt(data.started_at);
        setOpportunities((data.events ?? []).slice(0, MAX_EVENTS));
        setMarket(data.market ?? {});
        setScanners(data.scanners ?? {});
        if (data.settings) setSettings(data.settings);
        return;
      }

      if (data.type === "settings") {
        setSettings({ fee_percent: data.fee_percent, min_profit_usd: data.min_profit_usd });
        return;
      }

      if (data.type === "status") {
        if (data.market) setMarket(data.market);
        if (data.scanners) setScanners(data.scanners);
        if (data.performance) setPerformanceStats(data.performance);
        return;
      }

      if (data.type === "opportunity") {
        setOpportunities((previous) => [data, ...previous.slice(0, MAX_EVENTS - 1)]);
      }
    };
  }

  function updateSettings(next: OptionsSettings) {
    setSettings(next);

    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          type: "settings",
          fee_percent: next.fee_percent,
          min_profit_usd: next.min_profit_usd,
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
    market,
    scanners,
    performanceStats,
    opportunities,
    settings,
    serverStartedAt,
    updateSettings,
  };
}
