import Link from "next/link";
import { BoltIcon } from "@/app/components/icons";
import { ACCENTS, HOME_SCANNERS } from "@/app/components/home/scanners-config";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#05070B]">
      <header className="sticky top-0 z-50 border-b border-white/6 bg-[#05070B]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2F80FF] to-[#1a4fc4] text-white">
              <BoltIcon className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              SUPERSONIC<span className="text-[#2F80FF]">SCAN</span>
            </span>
          </Link>
          <div className="ml-2 border-l border-white/6 pl-3 text-sm font-semibold text-white">About</div>
        </div>
      </header>

      <main className="mx-auto max-w-[800px] px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-white">About SuperSonicScan</h1>

        <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
          SuperSonicScan is a real-time market intelligence terminal that
          continuously scans crypto and Saudi equity markets for arbitrage,
          statistical edges, and pricing inefficiencies — surfacing them as
          they happen instead of leaving them buried in raw data.
        </p>

        <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
          The platform is built around six scanning engines spanning three
          asset classes: cryptocurrency spot and derivatives markets, and the
          Saudi Exchange (Tadawul). Every scanner shows its underlying
          statistics — spreads, z-scores, correlations, cointegration — not
          just a signal, so you can judge an opportunity on its merits.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HOME_SCANNERS.map((scanner) => {
            const accent = ACCENTS[scanner.accent];
            const Icon = scanner.icon;
            return (
              <div key={scanner.id} className="flex items-start gap-3 rounded-xl border border-white/6 bg-[#0B1220] p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.bgSoft} ${accent.text}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{scanner.title}</div>
                  <div className="mt-0.5 text-[12px] text-zinc-500">{scanner.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-[13px] text-zinc-600">
          No account, no login, no pricing tiers — every scanner on this site
          is free to use.
        </p>
      </main>
    </div>
  );
}
