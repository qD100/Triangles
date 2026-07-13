"use client";

import { useRouter } from "next/navigation";
import CoinIcon from "./CoinIcon";
import { TrendIcon } from "../icons";

export type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
};

type FlashDirection = "up" | "down" | null;

const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

function formatCompactUsd(value: number) {
  return `$${compactUsdFormatter.format(value)}`;
}

function formatPrice(value: number) {
  const maximumFractionDigits = value >= 1 ? 2 : 6;

  return value.toLocaleString(undefined, { maximumFractionDigits });
}

type Props = {
  coin: Coin;

  flash?: FlashDirection;

  arbitrageGlow?: "none" | "base" | "route";

  temporary?: boolean;
};

export default function CoinRow({
  coin,
  flash = null,
  arbitrageGlow = "none",
  temporary = false,
}: Props) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/coin/${coin.symbol.toLowerCase()}`)}
      className={`
        group
        h-14
        sm:h-16
        cursor-pointer
        border-b
        border-zinc-900
        transition-all
        duration-200

        ${
          arbitrageGlow === "base"
            ? "bg-blue-500/10 shadow-[inset_0_0_35px_rgba(59,130,246,.6)]"
            : ""
        }

        ${
          arbitrageGlow === "route"
            ? "bg-yellow-400/10 shadow-[inset_0_0_35px_rgba(250,204,21,.6)]"
            : ""
        }

        ${
          temporary
            ? "animate-pulse"
            : ""
        }
      `}
    >
      {/* Rank */}

      <td className="px-1.5 text-xs text-zinc-500 sm:px-4 sm:text-base">

        {temporary ? "ARB" : coin.market_cap_rank}

      </td>

      {/* Coin */}

      <td className="px-1.5 overflow-hidden sm:px-4">

        <div className="flex items-center gap-2 sm:gap-3">

          <CoinIcon symbol={coin.symbol} size="clamp(22px, 7vw, 36px)" />

          <div className="min-w-0">

            <div className="truncate text-[11px] font-semibold text-white sm:hidden">

              {coin.symbol}

            </div>

            <div className="hidden truncate font-semibold text-white sm:block">

              {coin.name}

            </div>

            <div className="hidden truncate text-xs uppercase tracking-wide text-zinc-500 sm:block">

              {coin.symbol}

            </div>

          </div>

        </div>

      </td>

      {/* Price */}

      <td className="px-1.5 text-right font-mono whitespace-nowrap text-[11px] sm:px-4 sm:text-base">

        <span
          className={`
            transition-all

            ${
              flash === "up"
                ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,1)]"
                : ""
            }

            ${
              flash === "down"
                ? "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,1)]"
                : ""
            }

            ${
              flash === null
                ? "text-white"
                : ""
            }
          `}
        >
          $
          {formatPrice(coin.current_price)}
        </span>

      </td>

      {/* 24H */}

      <td className="px-1.5 text-right whitespace-nowrap text-[11px] sm:px-4 sm:text-base">

        <span
          className={
            coin.price_change_percentage_24h >= 0
              ? "font-semibold text-emerald-400"
              : "font-semibold text-red-400"
          }
        >
          {coin.price_change_percentage_24h.toFixed(2)}%
        </span>

      </td>

      {/* Market Cap */}

      <td className="relative px-1.5 text-right text-[11px] text-zinc-300 whitespace-nowrap sm:px-4 sm:text-base">

        {coin.market_cap > 0 ? formatCompactUsd(coin.market_cap) : "—"}

        <span className="absolute right-1.5 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#1b1b1b] opacity-0 shadow-[0_0_8px_4px_rgba(27,27,27,0.9)] transition-opacity duration-150 group-hover:opacity-100 sm:flex sm:right-3">
          <TrendIcon className="h-3.5 w-3.5 text-blue-400" />
        </span>

      </td>

    </tr>
  );
}