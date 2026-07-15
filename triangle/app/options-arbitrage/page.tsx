"use client";

import { useState } from "react";
import Link from "next/link";
import ArbitrageLauncher from "@/app/components/ArbitrageLauncher";
import { GearIcon, TriangleLogoIcon } from "@/app/components/icons";
import useOptionsScanner from "@/app/components/hooks/useOptionsScanner";
import OptionsMarketPanel from "./OptionsMarketPanel";
import OptionsEngineCard, { OPTIONS_ENGINES } from "./OptionsEngineCard";
import OptionsFeed from "./OptionsFeed";
import OptionsSettingsPanel from "./OptionsSettingsPanel";

export default function OptionsArbitragePage() {
  const scanner = useOptionsScanner();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#111111]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
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

          <div className="relative">
            <button
              type="button"
              aria-label="Settings"
              onClick={() => setSettingsOpen((value) => !value)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#181818] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white sm:h-9 sm:w-9"
            >
              <GearIcon />
            </button>

            {settingsOpen && (
              <OptionsSettingsPanel
                settings={scanner.settings}
                onUpdate={scanner.updateSettings}
                onClose={() => setSettingsOpen(false)}
              />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Options Arbitrage Scanner</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Discover pricing inefficiencies in Binance European Options.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_1fr_1.15fr] lg:gap-6">
          <OptionsMarketPanel market={scanner.market} connected={scanner.connected} />

          <section className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40 sm:h-[640px] lg:h-[820px]">
            <div className="border-b border-zinc-800 p-5">
              <h2 className="text-xl font-bold tracking-wide text-yellow-400">LIVE ARBITRAGE ENGINES</h2>
              <p className="mt-1 text-sm text-zinc-500">Four scanners running simultaneously</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {OPTIONS_ENGINES.map((engine) => (
                <OptionsEngineCard key={engine.id} engine={engine} status={scanner.scanners[engine.id]} />
              ))}
            </div>
          </section>

          <OptionsFeed opportunities={scanner.opportunities} />
        </div>
      </main>

      <footer className="sticky bottom-0 z-40 border-t border-zinc-800 bg-[#111111]/90 backdrop-blur">
        <div className="mx-auto flex h-11 max-w-[1800px] items-center gap-5 overflow-x-auto px-4 text-xs sm:px-6 lg:justify-between lg:gap-0 lg:overflow-visible lg:px-8">
          <FooterItem label="Connection">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                scanner.connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-zinc-300">{scanner.connected ? "Binance (EAPI)" : "Disconnected"}</span>
          </FooterItem>

          <FooterItem label="Contracts Scanned">
            <span className="font-mono text-zinc-300">
              {scanner.performanceStats?.contracts_scanned_total ?? 0}
            </span>
          </FooterItem>

          <FooterItem label="Scans/sec">
            <span className="font-mono text-emerald-400">
              {(scanner.performanceStats?.scans_per_sec ?? 0).toFixed(2)}
            </span>
          </FooterItem>

          <FooterItem label="Avg Scan Time">
            <span className="font-mono text-zinc-300">
              {(scanner.performanceStats?.avg_scan_time_ms ?? 0).toFixed(0)} ms
            </span>
          </FooterItem>

          <FooterItem label="Last Update">
            <span className="font-mono text-zinc-300">{scanner.performanceStats?.last_update ?? "—"}</span>
          </FooterItem>
        </div>
      </footer>
    </>
  );
}

function FooterItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="whitespace-nowrap uppercase tracking-wider text-zinc-600">{label}</span>
      <span className="flex items-center gap-1.5">{children}</span>
    </div>
  );
}
