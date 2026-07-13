"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import CoinIcon from "@/app/components/Market/CoinIcon";
import { TriangleLogoIcon } from "@/app/components/icons";
import { initialCoins } from "@/app/data/initialCoins";
import SpreadChart from "./SpreadChart";
import useSpotFuturesTicker from "./useSpotFuturesTicker";

type Snapshot = {
  symbol: string;
  name: string | null;
  price: number | null;
  percentChange24h: number | null;
  percentChange30d: number | null;
  percentChange1y: number | null;
  volume24h: number | null;
  marketCap: number | null;
};

const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

function formatCompactUsd(value: number | null) {
  if (value === null) return "—";

  return `$${compactUsdFormatter.format(value)}`;
}

function formatPrice(value: number | null) {
  if (value === null) return "—";

  const maximumFractionDigits = value >= 1 ? 2 : 6;

  return `$${value.toLocaleString(undefined, { maximumFractionDigits })}`;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function percentColor(value: number | null) {
  if (value === null) return "text-zinc-500";

  return value >= 0 ? "text-emerald-400" : "text-red-400";
}

function priceFlashClass(flash: "up" | "down" | null) {
  if (flash === "up") return "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,1)]";
  if (flash === "down") return "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,1)]";
  return "text-white";
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function CoinPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();

  const seedCoin = initialCoins.find(
    (coin) => coin.symbol.toUpperCase() === upperSymbol
  );

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [livePercent24h, setLivePercent24h] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  const priceFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spotFutures = useSpotFuturesTicker(upperSymbol);

  const mountedAt = useRef(0);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  useEffect(() => {
    mountedAt.current = Date.now();

    const interval = setInterval(() => {
      setUptimeSeconds(Math.floor((Date.now() - mountedAt.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/coin/${symbol}`);
        const data: Snapshot = await response.json();

        if (!cancelled) setSnapshot(data);
      } catch {
        // keep previous snapshot on failure
      }
    }

    load();

    // Volume/market cap don't move fast; price/24H come live over the
    // websocket below. This poll is just a slow-moving fallback/refresh.
    const interval = setInterval(load, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol]);

  useEffect(() => {
    if (upperSymbol === "USDT") return;

    let socket: WebSocket | null = null;
    let closedByUs = false;

    function connect() {
      socket = new WebSocket(
        `wss://stream.binance.com:9443/ws/${upperSymbol.toLowerCase()}usdt@ticker`
      );

      socket.onmessage = (event) => {
        const ticker = JSON.parse(event.data);
        const newPrice = Number(ticker.c);

        if (prevPriceRef.current !== null && newPrice !== prevPriceRef.current) {
          setPriceFlash(newPrice > prevPriceRef.current ? "up" : "down");

          if (priceFlashTimeoutRef.current) clearTimeout(priceFlashTimeoutRef.current);
          priceFlashTimeoutRef.current = setTimeout(() => setPriceFlash(null), 1000);
        }

        prevPriceRef.current = newPrice;
        setLivePrice(newPrice);
        setLivePercent24h(Number(ticker.P));
      };

      socket.onclose = () => {
        if (!closedByUs) setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      closedByUs = true;
      socket?.close();
      if (priceFlashTimeoutRef.current) clearTimeout(priceFlashTimeoutRef.current);
    };
  }, [upperSymbol]);

  const displayName = snapshot?.name ?? seedCoin?.name ?? upperSymbol;
  const displayPrice = livePrice ?? snapshot?.price ?? null;
  const displayPercent24h = livePercent24h ?? snapshot?.percentChange24h ?? null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#111111]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-3 sm:h-16 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <TriangleLogoIcon className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Back to Terminal</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-6">
        <section className="rounded-xl border border-zinc-800 bg-[#111111] p-4 shadow-2xl shadow-black/40 sm:p-6">
          <div className="flex items-center gap-3">
            <CoinIcon symbol={upperSymbol} size={44} />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white sm:text-2xl">
                  {displayName}
                </h1>
                <span className="text-sm uppercase tracking-wide text-zinc-500">
                  {upperSymbol}
                </span>
              </div>

              {seedCoin && (
                <div className="text-xs text-zinc-600">
                  Rank #{seedCoin.market_cap_rank}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat
              label="Price"
              value={formatPrice(displayPrice)}
              className={priceFlashClass(priceFlash)}
              live={livePrice !== null}
            />

            <Stat
              label="24H"
              value={formatPercent(displayPercent24h)}
              className={percentColor(displayPercent24h)}
            />

            <Stat
              label="Spread"
              value={
                spotFutures.current
                  ? `${spotFutures.current.spread_percent >= 0 ? "+" : ""}${spotFutures.current.spread_percent.toFixed(4)}%`
                  : "—"
              }
              className={percentColor(spotFutures.current?.spread_percent ?? null)}
              live={spotFutures.current !== null}
            />

            <Stat
              label="Funding Rate"
              value={
                spotFutures.current
                  ? `${spotFutures.current.funding_rate_percent >= 0 ? "+" : ""}${spotFutures.current.funding_rate_percent.toFixed(4)}%`
                  : "—"
              }
              className={percentColor(spotFutures.current?.funding_rate_percent ?? null)}
            />

            <Stat
              label="Volume 24H"
              value={formatCompactUsd(snapshot?.volume24h ?? null)}
            />

            <Stat
              label="Market Cap"
              value={formatCompactUsd(snapshot?.marketCap ?? null)}
            />
          </div>

          {spotFutures.current && (
            <div className="mt-3 text-[11px] text-zinc-600">
              Est. funding APY:{" "}
              <span className={percentColor(spotFutures.current.funding_apy_percent)}>
                {spotFutures.current.funding_apy_percent >= 0 ? "+" : ""}
                {spotFutures.current.funding_apy_percent.toFixed(2)}%
              </span>
            </div>
          )}
        </section>

        <SpreadChart
          symbol={upperSymbol}
          connected={spotFutures.connected}
          current={spotFutures.current}
          history={spotFutures.history}
        />
      </main>

      <footer className="sticky bottom-0 z-40 border-t border-zinc-800 bg-[#111111]/90 backdrop-blur">
        <div className="mx-auto flex h-11 max-w-[1800px] items-center gap-5 overflow-x-auto px-4 text-xs sm:px-6 lg:justify-between lg:gap-0 lg:overflow-visible lg:px-8">
          <FooterItem label="Connection">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                spotFutures.connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-zinc-300">
              {spotFutures.connected ? "Binance (WSS)" : "Disconnected"}
            </span>
          </FooterItem>

          <FooterItem label="Latency">
            <span className="font-mono text-emerald-400">{spotFutures.latency} ms</span>
          </FooterItem>

          <FooterItem label="Uptime">
            <span className="font-mono text-zinc-300">{formatDuration(uptimeSeconds)}</span>
          </FooterItem>
        </div>
      </footer>
    </>
  );
}

function Stat({
  label,
  value,
  className = "text-white",
  live = false,
}: {
  label: string;
  value: string;
  className?: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#181818] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 sm:text-[11px]">
        {label}
        {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      </div>
      <div className={`mt-1 font-mono text-sm font-bold transition-all sm:text-lg ${className}`}>
        {value}
      </div>
    </div>
  );
}

function FooterItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="whitespace-nowrap uppercase tracking-wider text-zinc-600">
        {label}
      </span>
      <span className="flex items-center gap-1.5">{children}</span>
    </div>
  );
}
