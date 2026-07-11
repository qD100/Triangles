"use client";

import { useEffect, useRef, useState } from "react";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
};

type ArbitrageMessage = {
  type: string;
  time: string;
  route: string[];
  path: string;
  profit: number;
};

type Arbitrage = ArbitrageMessage & {
  lastSeen: number;
};

type PriceDirection = "up" | "down" | null;

export default function CryptoTable({
  initialCoins,
}: {
  initialCoins: Coin[];
}) {
  const [coins, setCoins] = useState<Coin[]>(initialCoins);

  const [temporaryCoin, setTemporaryCoin] =
    useState<string | null>(null);

  const [activeCoin, setActiveCoin] =
    useState<string | null>(null);

  const [arbitrages, setArbitrages] =
    useState<Arbitrage[]>([]);

  const [priceDirections, setPriceDirections] = useState<
    Record<string, PriceDirection>
  >({});

  const animationQueue = useRef<ArbitrageMessage[]>([]);
  const isAnimating = useRef(false);

  const fadeTimers = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // ================= ARBITRAGE ANIMATION =================

  async function animateRoute(arbitrage: ArbitrageMessage) {
    isAnimating.current = true;

    const marketSymbols = new Set(
      coins.map((coin) => coin.symbol.toUpperCase())
    );

    const missingCoin = arbitrage.route.find(
      (symbol) =>
        symbol !== "USDT" &&
        !marketSymbols.has(symbol)
    );

    if (missingCoin) {
      setTemporaryCoin(missingCoin);
    }

    await sleep(100);

    for (const symbol of arbitrage.route) {
      setActiveCoin(symbol);

      await sleep(100);

      setActiveCoin(null);

      await sleep(50);
    }

    await sleep(500);

    setTemporaryCoin(null);

    isAnimating.current = false;

    processAnimationQueue();
  }

  function processAnimationQueue() {
    if (isAnimating.current) return;

    const next = animationQueue.current.shift();

    if (next) {
      animateRoute(next);
    }
  }

  // ================= ARBITRAGE SOCKET =================

  useEffect(() => {
    const socket = new WebSocket(
      "ws://localhost:8000/ws/arbitrage"
    );

    socket.onopen = () => {
      console.log("Connected to arbitrage engine");
    };

    socket.onmessage = (event) => {
      const incoming: ArbitrageMessage =
        JSON.parse(event.data);

      if (incoming.type !== "arbitrage") return;

      const now = Date.now();

      setArbitrages((current) => {
        const existing = current.find(
          (arb) => arb.path === incoming.path
        );

        if (existing) {
          return current
            .map((arb) =>
              arb.path === incoming.path
                ? {
                    ...arb,
                    profit: incoming.profit,
                    time: incoming.time,
                    lastSeen: now,
                  }
                : arb
            )
            .sort((a, b) => b.profit - a.profit);
        }

        return [
          {
            ...incoming,
            lastSeen: now,
          },
          ...current,
        ]
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 10);
      });

      animationQueue.current.push(incoming);

      processAnimationQueue();
    };

    socket.onerror = (error) => {
      console.error(
        "Arbitrage WebSocket error:",
        error
      );
    };

    return () => socket.close();
  }, []);

  // ================= STATUS REFRESH =================

  useEffect(() => {
    const interval = setInterval(() => {
      setArbitrages((current) => [...current]);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // ================= BINANCE PRICE SOCKET =================

  useEffect(() => {
    const socket = new WebSocket(
      "wss://stream.binance.com:9443/ws/!miniTicker@arr"
    );

    socket.onmessage = (event) => {
      const tickers = JSON.parse(event.data);

      setCoins((currentCoins) =>
        currentCoins.map((coin) => {
          const symbol =
            `${coin.symbol.toUpperCase()}USDT`;

          const ticker = tickers.find(
            (ticker: any) => ticker.s === symbol
          );

          if (!ticker) return coin;

          const newPrice = Number(ticker.c);

          let direction: PriceDirection = null;

          if (
            coin.current_price > 0 &&
            newPrice > coin.current_price
          ) {
            direction = "up";
          }

          if (
            coin.current_price > 0 &&
            newPrice < coin.current_price
          ) {
            direction = "down";
          }

          if (direction) {
            setPriceDirections((current) => ({
              ...current,
              [coin.id]: direction,
            }));

            if (fadeTimers.current[coin.id]) {
              clearTimeout(
                fadeTimers.current[coin.id]
              );
            }

            fadeTimers.current[coin.id] =
              setTimeout(() => {
                setPriceDirections((current) => ({
                  ...current,
                  [coin.id]: null,
                }));
              }, 100);
          }

          return {
            ...coin,
            current_price: newPrice,
          };
        })
      );
    };

    return () => {
      socket.close();

      Object.values(fadeTimers.current).forEach(
        clearTimeout
      );
    };
  }, []);

  // ================= ROW =================

  function renderCoinRow(coin: Coin) {
    const symbol = coin.symbol.toUpperCase();

    const direction = priceDirections[coin.id];

    const isActive = activeCoin === symbol;

    const isBase = symbol === "USDT";

    return (
      <tr
        key={coin.id}
        className={`
          h-[72px]
          border-b border-zinc-900
          transition-all duration-100

          ${
            isActive && isBase
              ? "bg-blue-500/20 shadow-[inset_0_0_35px_rgba(59,130,246,0.7)]"
              : ""
          }

          ${
            isActive && !isBase
              ? "bg-yellow-400/20 shadow-[inset_0_0_35px_rgba(250,204,21,0.7)]"
              : ""
          }
        `}
      >
        <td className="px-4 text-zinc-500">
          {coin.market_cap_rank}
        </td>

        <td className="px-4">
          <div className="flex items-center gap-3">
            <img
              src={coin.image}
              alt={coin.name}
              className="h-8 w-8"
            />

            <div>
              <div className="font-semibold">
                {coin.name}
              </div>

              <div className="text-xs text-zinc-500">
                {symbol}
              </div>
            </div>
          </div>
        </td>

        <td className="px-4 text-right font-mono">
          <span
            className={
              direction === "up"
                ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,1)] transition-all duration-100"
                : direction === "down"
                ? "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,1)] transition-all duration-100"
                : "text-white drop-shadow-none transition-all duration-1000"
            }
          >
            $
            {coin.current_price.toLocaleString(
              undefined,
              {
                maximumFractionDigits: 6,
              }
            )}
          </span>
        </td>

        <td className="px-4 text-right">
          <span
            className={
              coin.price_change_percentage_24h >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }
          >
            {coin.price_change_percentage_24h.toFixed(2)}
            %
          </span>
        </td>

        <td className="px-4 text-right text-zinc-300">
          ${coin.market_cap.toLocaleString()}
        </td>
      </tr>
    );
  }

  // ================= UI =================

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
      {/* MARKET */}

      <div>
        <h1 className="text-2xl font-bold">
          Crypto Market
        </h1>

        <p className="mb-6 text-sm text-zinc-500">
          Top cryptocurrencies by market capitalization
        </p>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <table className="w-full">
            <thead className="h-[50px] border-b border-zinc-800 text-xs text-zinc-500">
              <tr>
                <th className="px-4 text-left">#</th>

                <th className="px-4 text-left">
                  Coin
                </th>

                <th className="px-4 text-right">
                  Price
                </th>

                <th className="px-4 text-right">
                  24h
                </th>

                <th className="px-4 text-right">
                  Market Cap
                </th>
              </tr>
            </thead>

            <tbody>
              {coins.map(renderCoinRow)}

              {/* PERMANENT ARBITRAGE SLOT */}

              <tr
                className={`
                  h-[72px]
                  transition-all duration-100

                  ${
                    temporaryCoin &&
                    activeCoin === temporaryCoin
                      ? "bg-yellow-400/20 shadow-[inset_0_0_35px_rgba(250,204,21,0.7)]"
                      : ""
                  }
                `}
              >
                {temporaryCoin ? (
                  <>
                    <td className="px-4 text-xs text-zinc-500">
                      ARB
                    </td>

                    <td className="px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400/10 text-[10px] text-yellow-400">
                          ARB
                        </div>

                        <div>
                          <div className="font-semibold">
                            {temporaryCoin}
                          </div>

                          <div className="text-xs text-zinc-500">
                            {temporaryCoin}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 text-right font-mono">
                      —
                    </td>

                    <td className="px-4 text-right text-yellow-400">
                      ACTIVE
                    </td>

                    <td className="px-4 text-right text-zinc-500">
                      Arbitrage Route
                    </td>
                  </>
                ) : (
                  <td
                    colSpan={5}
                    className="px-4 text-center text-xs text-zinc-800"
                  >
                    ARBITRAGE ROUTE SLOT
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* LIVE ARBITRAGE */}

      <div>
        <h1 className="text-2xl font-bold">
          Live Arbitrage
        </h1>

        <p className="mb-6 text-sm text-zinc-500">
          Real-time triangular arbitrage scanner
        </p>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <table className="w-full">
            <thead className="h-[50px] border-b border-zinc-800 text-xs text-zinc-500">
              <tr>
                <th className="px-4 text-left">
                  Status
                </th>

                <th className="px-4 text-left">
                  Route
                </th>

                <th className="px-4 text-right">
                  Profit
                </th>
              </tr>
            </thead>

            <tbody>
              {arbitrages.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="h-[720px] text-center text-zinc-600"
                  >
                    Waiting for arbitrage opportunities...
                  </td>
                </tr>
              ) : (
                arbitrages.map((arb) => {
                  const isLive =
                    Date.now() - arb.lastSeen < 5000;

                  return (
                    <tr
                      key={arb.path}
                      className="h-[72px] border-b border-zinc-900"
                    >
                      <td className="px-4">
                        {isLive ? (
                          <span className="text-xs font-semibold text-emerald-400">
                            ● LIVE
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">
                            ● EXPIRED
                          </span>
                        )}
                      </td>

                      <td className="px-4 font-mono text-xs">
                        {arb.path}
                      </td>

                      <td
                        className={`px-4 text-right font-mono text-xs ${
                          isLive
                            ? "text-emerald-400"
                            : "text-zinc-600"
                        }`}
                      >
                        +{arb.profit.toFixed(5)}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}