"use client";

import ScannerCard from "./ScannerCard";
import { HOME_SCANNERS } from "./scanners-config";
import { useDashboardSnapshot } from "./dashboard/useDashboardSnapshot";
import type { DashboardSnapshot } from "./dashboard/types";
import TriangularMini from "./dashboard/TriangularMini";
import SpotFutureMini from "./dashboard/SpotFutureMini";
import OptionsMini from "./dashboard/OptionsMini";
import PairsMini from "./dashboard/PairsMini";
import EtfMini from "./dashboard/EtfMini";
import CorrelationMini from "./dashboard/CorrelationMini";
import { TooltipProvider } from "@/app/tasi/InfoTooltip";

function renderDashboard(scannerId: string, snapshot: DashboardSnapshot) {
  switch (scannerId) {
    case "triangular":
      return <TriangularMini data={snapshot.triangular} />;
    case "spot-futures":
      return <SpotFutureMini data={snapshot.spotFuture} />;
    case "options":
      return <OptionsMini data={snapshot.options} />;
    case "pairs":
      return <PairsMini data={snapshot.pairs} />;
    case "etf-tasi":
      return <EtfMini data={snapshot.etf} />;
    case "correlation":
      return <CorrelationMini data={snapshot.correlation} />;
    default:
      return null;
  }
}

export default function ScannerGrid() {
  const snapshot = useDashboardSnapshot();

  return (
    <TooltipProvider delay={200}>
      <section id="scanners" className="mx-auto max-w-[1600px] px-4 pb-6 pt-2 sm:px-6 lg:px-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Scanner Suite</h2>
            <p className="mt-1 text-sm text-zinc-500">Six engines, one terminal. Pick your edge.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {HOME_SCANNERS.map((scanner) => (
            <ScannerCard key={scanner.id} scanner={scanner} dashboard={renderDashboard(scanner.id, snapshot)} />
          ))}
        </div>
      </section>
    </TooltipProvider>
  );
}
