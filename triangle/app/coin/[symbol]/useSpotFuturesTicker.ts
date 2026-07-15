"use client";

import { useEffect, useRef, useState } from "react";

export type SpreadRow = {
  time: string;
  symbol: string;
  spot: number;
  futures: number;
  spread_percent: number;
  net_percent: number;
  is_opportunity: boolean;
  funding_rate_percent: number;
  funding_apy_percent: number;
  next_funding_time: number | null;
};

export type SpreadPoint = {
  time: number;
  spot: number;
  futures: number;
};

export type SpotFuturesPosition = {
  phase: "scanning" | "open" | "idle";
  entry: {
    spot: number;
    futures: number;
    time: number;
    spread: number;
  } | null;
};

// Field names match the backend's wire format directly (snake_case, same
// convention as SpreadRow above) since this is now server-owned state, not
// a shape the frontend invents — one less translation layer.
export type SpotFuturesConditions = {
  min_spread_percent: number;
  min_net_profit_percent: number;
  auto_entry: boolean;
  auto_reset_after_close: boolean;
};

const MAX_HISTORY = 500;

export default function useSpotFuturesTicker(symbol: string) {
  const socket = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [current, setCurrent] = useState<SpreadRow | null>(null);
  const [history, setHistory] = useState<SpreadPoint[]>([]);
  const [position, setPosition] = useState<SpotFuturesPosition | null>(null);
  const [conditions, setConditions] = useState<SpotFuturesConditions | null>(null);
  const [serverStartedAt, setServerStartedAt] = useState<number | null>(null);

  // A new symbol's spread history has nothing to do with the previous
  // one's — reset during render (React's documented pattern for adjusting
  // state when a prop changes) rather than in the effect below.
  const [trackedSymbol, setTrackedSymbol] = useState(symbol);

  if (symbol !== trackedSymbol) {
    setTrackedSymbol(symbol);
    setCurrent(null);
    setHistory([]);
    setPosition(null);
  }

  useEffect(() => {
    let closedByUs = false;

    function applyPositionsAndConditions(
      positions: Record<string, SpotFuturesPosition> | undefined,
      nextConditions: SpotFuturesConditions | undefined
    ) {
      if (positions?.[`${symbol}USDT`]) setPosition(positions[`${symbol}USDT`]);
      if (nextConditions) setConditions(nextConditions);
    }

    function connect() {
      const wsUrl =
        process.env.NEXT_PUBLIC_SPOTFUTURES_WS_URL ??
        "ws://localhost:8000/ws/spotfutures";

      socket.current = new WebSocket(wsUrl);

      socket.current.onopen = () => {
        setConnected(true);
        // Request this symbol's retained history + current position/
        // conditions — the chart and position card catch up instantly
        // instead of starting from empty.
        socket.current?.send(JSON.stringify({ type: "subscribe", symbol }));
      };

      socket.current.onclose = () => {
        setConnected(false);
        if (!closedByUs) setTimeout(connect, 2000);
      };

      socket.current.onmessage = (message) => {
        const start = performance.now();
        const data = JSON.parse(message.data);

        if (data.type === "init") {
          setServerStartedAt(data.started_at);
          return;
        }

        if (data.type === "history") {
          if (data.symbol !== symbol) return;

          setHistory(
            (data.points ?? []).map((point: SpreadPoint) => ({
              time: point.time,
              spot: point.spot,
              futures: point.futures,
            }))
          );
          applyPositionsAndConditions(data.positions, data.conditions);
          return;
        }

        if (data.type === "conditions") {
          setConditions(data.conditions);
          return;
        }

        if (data.type === "positions") {
          applyPositionsAndConditions(data.positions, undefined);
          return;
        }

        if (data.type !== "status") return;

        const pairs: SpreadRow[] = data.pairs ?? [];
        const row = pairs.find((pair) => pair.symbol === `${symbol}USDT`);

        setCurrent(row ?? null);
        applyPositionsAndConditions(data.positions, data.conditions);

        if (row) {
          setHistory((previous) => [
            ...previous.slice(-(MAX_HISTORY - 1)),
            { time: Date.now(), spot: row.spot, futures: row.futures },
          ]);
        }

        setLatency(Math.round(performance.now() - start));
      };
    }

    connect();

    return () => {
      closedByUs = true;
      socket.current?.close();
    };
  }, [symbol]);

  function resetPosition() {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: "reset_position", symbol }));
    }
  }

  function updateConditions(next: SpotFuturesConditions) {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: "update_conditions", ...next }));
    }
  }

  return {
    connected,
    latency,
    current,
    history,
    position,
    conditions,
    serverStartedAt,
    resetPosition,
    updateConditions,
  };
}
