import Link from "next/link";
import ArbitrageLauncher from "@/app/components/ArbitrageLauncher";
import { TriangleLogoIcon } from "@/app/components/icons";
import type { OptionsTier } from "./tiers";

export default function TierComingSoon({ tier }: { tier: OptionsTier }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#111111]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
          <ArbitrageLauncher />

          <Link
            href="/options-arbitrage"
            className="flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <TriangleLogoIcon className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Back to Options Arbitrage</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Tier {tier.number}
        </div>

        <h1 className="text-2xl font-bold text-white sm:text-3xl">{tier.name}</h1>

        <p className="text-sm uppercase tracking-wide text-zinc-500">Coming Soon</p>

        <p className="max-w-md text-sm leading-relaxed text-zinc-400">{tier.description}</p>

        <ul className="flex flex-wrap justify-center gap-2">
          {tier.scanners.map((scanner) => (
            <li
              key={scanner}
              className="rounded-full border border-zinc-800 bg-[#181818] px-3 py-1 text-xs text-zinc-300"
            >
              {scanner}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
