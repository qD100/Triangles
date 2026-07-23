import Link from "next/link";
import ArbitrageLauncher from "@/app/components/ArbitrageLauncher";
import { TriangleLogoIcon } from "@/app/components/icons";
import { getEtfScannerData } from "@/lib/tasi/etf-scanner";
import { getPairsScannerData } from "@/lib/tasi/pairs-scanner";
import Tabs from "./Tabs";
import OverviewPanel from "./OverviewPanel";
import ETFScanner from "./ETFScanner";
import PairScanner from "./PairScanner";
import AnalyticsRankings from "./AnalyticsRankings";

const TAB_KEYS = ["overview", "etf", "pairs", "analytics"] as const;

export default async function TasiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab = (TAB_KEYS as readonly string[]).includes(tab ?? "") ? tab! : "overview";

  const [etfSettled, pairsSettled] = await Promise.allSettled([
    getEtfScannerData(),
    getPairsScannerData(),
  ]);

  const etfData = etfSettled.status === "fulfilled" ? etfSettled.value : null;
  const etfError = etfSettled.status === "rejected" ? String(etfSettled.reason) : null;

  const pairsData = pairsSettled.status === "fulfilled" ? pairsSettled.value : null;
  const pairsError = pairsSettled.status === "rejected" ? String(pairsSettled.reason) : null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#111111]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
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

          <div className="ml-1 border-l border-zinc-800 pl-3 sm:ml-2 sm:pl-4">
            <h1 className="text-sm font-bold text-white sm:text-base">TASI Scanner</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] flex-1 p-3 sm:p-6">
        {!etfData || !pairsData ? (
          <div className="mx-auto max-w-xl rounded-md border border-zinc-800 bg-[#111111] px-6 py-8">
            <h2 className="text-sm font-semibold text-white">Failed to load market data</h2>
            <p className="mt-2 text-xs text-zinc-500">{etfError ?? pairsError}</p>
          </div>
        ) : (
          <Tabs
            defaultTab={defaultTab}
            tabs={[
              { key: "overview", label: "Overview", content: <OverviewPanel etfData={etfData} pairsData={pairsData} /> },
              { key: "etf", label: "ETF Arbitrage", content: <ETFScanner initialData={etfData} /> },
              { key: "pairs", label: "Pairs Trading", content: <PairScanner initialData={pairsData} /> },
              { key: "analytics", label: "Analytics", content: <AnalyticsRankings pairsData={pairsData} /> },
            ]}
          />
        )}
      </main>
    </>
  );
}
