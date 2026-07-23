"use client";

import { useEffect, useRef, useState } from "react";
import type { Coin } from "../types/crypto";

type FlashState = "up" | "down" | null;

export default function useMarketData(initialCoins: Coin[]) {
  const [coins, setCoins] = useState<Coin[]>(initialCoins);

  const [flashStates, setFlashStates] = useState<
    Record<string, FlashState>
  >({});

  const wsRef = useRef<WebSocket | null>(null);

  const timeoutRefs = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  function connect() {
    const streams = initialCoins
      .map((coin) => `${coin.symbol.toLowerCase()}usdt@ticker`)
      .join("/");

    wsRef.current = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${streams}`
    );

    wsRef.current.onopen = () => {
      console.log("✅ Binance Market Connected");
    };

    wsRef.current.onclose = () => {
      console.log("⚠ Binance disconnected");

      setTimeout(connect, 3000);
    };

    wsRef.current.onerror = () => {
      // WebSocket error events carry no diagnostic detail by design (browsers
      // withhold network error specifics from JS), so logging the bare event
      // just prints "{}" and trips Next.js's dev-mode console.error overlay.
      // The spec guarantees a `close` event follows every connection error,
      // and `onclose` below already reconnects after 3s — so this only warns.
      console.warn(
        `Binance WebSocket error (readyState=${wsRef.current?.readyState ?? "unknown"}); reconnecting on close.`
      );
    };

    wsRef.current.onmessage = (event) => {
      const json = JSON.parse(event.data);

      if (!json.data) return;

      const ticker = json.data;

      const symbol = ticker.s.replace("USDT", "").toUpperCase();

      const newPrice = Number(ticker.c);
      const priceChangePercent = Number(ticker.P);

      setCoins((previous) =>
        previous.map((coin) => {
          if (coin.symbol.toUpperCase() !== symbol)
            return coin;

          let direction: FlashState = null;

          if (newPrice > coin.current_price) {
            direction = "up";
          } else if (newPrice < coin.current_price) {
            direction = "down";
          }

          if (direction) {
            triggerFlash(coin.symbol, direction);
          }

          return {
            ...coin,
            current_price: newPrice,
            price_change_percentage_24h: priceChangePercent,
          };
        })
      );
    };
  }

  useEffect(() => {
    if (initialCoins.length === 0) return;

    connect();

    return () => {
      wsRef.current?.close();

      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerFlash(
    symbol: string,
    direction: FlashState
  ) {
    setFlashStates((previous) => ({
      ...previous,
      [symbol]: direction,
    }));

    if (timeoutRefs.current[symbol]) {
      clearTimeout(timeoutRefs.current[symbol]);
    }

    timeoutRefs.current[symbol] = setTimeout(() => {
      setFlashStates((previous) => ({
        ...previous,
        [symbol]: null,
      }));
    }, 1000);
  }

  return {
    coins,
    flashStates,
  };
}