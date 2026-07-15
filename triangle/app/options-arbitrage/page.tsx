import Link from "next/link";
import ArbitrageLauncher from "@/app/components/ArbitrageLauncher";
import { TriangleLogoIcon } from "@/app/components/icons";
import TierCard from "./TierCard";
import { OPTIONS_TIERS } from "./tiers";

export default function OptionsArbitragePage() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#111111]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
          <ArbitrageLauncher />

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

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 p-3 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Options Arbitrage Scanner</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Discover pricing inefficiencies in Binance European Options.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OPTIONS_TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>
      </main>
    </>
  );
}
