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

const MAX_HISTORY = 300;

export default function useSpotFuturesTicker(symbol: string) {
  const socket = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [current, setCurrent] = useState<SpreadRow | null>(null);
  const [history, setHistory] = useState<SpreadPoint[]>([]);

  // A new symbol's spread history has nothing to do with the previous
  // one's — reset during render (React's documented pattern for adjusting
  // state when a prop changes) rather than in the effect below.
  const [trackedSymbol, setTrackedSymbol] = useState(symbol);

  if (symbol !== trackedSymbol) {
    setTrackedSymbol(symbol);
    setCurrent(null);
    setHistory([]);
  }

  useEffect(() => {
    let closedByUs = false;

    function connect() {
      const wsUrl =
        process.env.NEXT_PUBLIC_SPOTFUTURES_WS_URL ??
        "ws://localhost:8000/ws/spotfutures";

      socket.current = new WebSocket(wsUrl);

      socket.current.onopen = () => setConnected(true);

      socket.current.onclose = () => {
        setConnected(false);
        if (!closedByUs) setTimeout(connect, 2000);
      };

      socket.current.onmessage = (message) => {
        const start = performance.now();
        const data = JSON.parse(message.data);

        if (data.type !== "status") return;

        const pairs: SpreadRow[] = data.pairs ?? [];
        const row = pairs.find((pair) => pair.symbol === `${symbol}USDT`);

        setCurrent(row ?? null);

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

  return { connected, latency, current, history };
}
