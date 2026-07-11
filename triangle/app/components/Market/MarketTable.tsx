"use client";

import CoinRow, { Coin } from "./CoinRow";

type Props = {
  coins: Coin[];

  flashStates?: Record<string, "up" | "down" | null>;

  glowStates?: Record<string, "none" | "base" | "route">;

  temporaryCoin?: Coin | null;
};

export default function MarketTable({
  coins,
  flashStates = {},
  glowStates = {},
  temporaryCoin = null,
}: Props) {
  // Keep exactly 10 rows
  const visibleCoins = coins.slice(0, 10);

  return (
    <section className="flex h-[820px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40">

      {/* Header */}

      <div className="border-b border-zinc-800 p-5">

        <h2 className="text-xl font-bold tracking-wide text-blue-400">
          LIVE MARKET
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Top cryptocurrencies by market capitalization
        </p>

      </div>

      {/* Table */}

      <div className="flex-1 overflow-hidden">

        <table className="w-full table-fixed">

          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[34%]" />
            <col className="w-[24%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
          </colgroup>

          <thead className="border-b border-zinc-800 bg-[#181818]">

            <tr className="h-12 text-xs uppercase tracking-wider text-zinc-500">

              <th className="px-4 text-left">
                #
              </th>

              <th className="px-4 text-left">
                Coin
              </th>

              <th className="px-4 text-right">
                Price
              </th>

              <th className="px-4 text-right">
                24H
              </th>

              <th className="px-4 text-right">
                Market Cap
              </th>

            </tr>

          </thead>

          <tbody>

            {visibleCoins.map((coin) => (

              <CoinRow
                key={coin.id}
                coin={coin}
                flash={flashStates[coin.symbol] ?? null}
                arbitrageGlow={glowStates[coin.symbol] ?? "none"}
              />

            ))}

            {/* Reserved Arbitrage Slot */}

            {temporaryCoin ? (

              <CoinRow
                coin={temporaryCoin}
                flash={null}
                arbitrageGlow="route"
                temporary
              />

            ) : (

              <tr className="h-16 border-t border-zinc-900">

                <td className="px-4 text-zinc-700">
                  11
                </td>

                <td className="px-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-700">
                      ○
                    </div>

                    <div className="text-xs uppercase tracking-wide text-zinc-700">
                      Reserved Slot
                    </div>

                  </div>

                </td>

                <td className="px-4 text-right text-zinc-800">—</td>

                <td className="px-4 text-right text-zinc-800">—</td>

                <td className="px-4 text-right text-zinc-800">—</td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

      {/* Footer */}

      <div className="border-t border-zinc-800 bg-[#101010]">

        <div className="grid grid-cols-3 gap-4 p-4">

          <Stat
            title="Tracking"
            value={`${coins.length}`}
          />

          <Stat
            title="Displayed"
            value="10"
          />

          <Stat
            title="Reserved"
            value="1"
          />

        </div>

      </div>

    </section>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#181818] p-3">

      <div className="text-[11px] uppercase tracking-wider text-zinc-500">

        {title}

      </div>

      <div className="mt-2 text-lg font-bold text-white">

        {value}

      </div>

    </div>
  );
}