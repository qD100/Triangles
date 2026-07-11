"use client";

import CoinIcon from "./CoinIcon";

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
  return (
    <tr
      className={`
        h-16
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

      <td className="px-4 text-zinc-500">

        {temporary ? "ARB" : coin.market_cap_rank}

      </td>

      {/* Coin */}

      <td className="px-4 overflow-hidden">

        <div className="flex items-center gap-3">

          <CoinIcon symbol={coin.symbol} size={36} />

          <div className="min-w-0">

            <div className="truncate font-semibold text-white">

              {coin.name}

            </div>

            <div className="truncate text-xs uppercase tracking-wide text-zinc-500">

              {coin.symbol}

            </div>

          </div>

        </div>

      </td>

      {/* Price */}

      <td className="px-4 text-right font-mono whitespace-nowrap">

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

      <td className="px-4 text-right whitespace-nowrap">

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

      <td className="px-4 text-right text-zinc-300 whitespace-nowrap">

        {coin.market_cap > 0 ? formatCompactUsd(coin.market_cap) : "—"}

      </td>

    </tr>
  );
}