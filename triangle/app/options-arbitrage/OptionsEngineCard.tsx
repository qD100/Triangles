"use client";

import { useEffect, useState } from "react";
import InfoButton from "@/app/components/InfoButton";
import type { InfoDocSlug } from "@/app/data/infoDocs";
import type { ScannerId, ScannerStatus } from "@/app/components/hooks/useOptionsScanner";

export type EngineDef = {
  id: ScannerId;
  title: string;
  algorithms: string[];
  infoSlug: InfoDocSlug;
};

// Adding a fifth engine later is one entry here plus one activity-phrase
// list below — the center column renders straight from this array.
export const OPTIONS_ENGINES: EngineDef[] = [
  { id: "core", title: "Core Arbitrage", algorithms: ["Put-Call Parity"], infoSlug: "put-call-parity" },
  { id: "box", title: "Box Spread", algorithms: ["Long Box", "Short Box"], infoSlug: "box-spread" },
  {
    id: "synthetic",
    title: "Synthetic Arbitrage",
    algorithms: ["Conversion", "Reverse Conversion"],
    infoSlug: "synthetic-conversion",
  },
  {
    id: "chain",
    title: "Option Chain Analysis",
    algorithms: ["Convexity", "Butterfly Arbitrage", "Calendar Arbitrage", "Pricing Bounds"],
    infoSlug: "option-chain-analysis",
  },
];

const ACTIVITY_PHRASES: Record<ScannerId, string[]> = {
  core: ["Checking expiry...", "Loading contracts...", "Computing parity..."],
  box: ["Checking expiry...", "Building box spreads...", "Evaluating spreads..."],
  synthetic: ["Checking expiry...", "Comparing spot vs synthetic...", "Evaluating conversions..."],
  chain: ["Checking convexity...", "Scanning butterflies...", "Checking calendar spreads...", "Checking pricing bounds..."],
};

// The backend cycle itself is sub-second (a batch compute over a few
// hundred contracts), so this plays a short animated "scanning" phase after
// each fresh server report before settling on the real result — visualizes
// the real (just fast) cycle instead of the card silently flipping state.
const ANIMATION_MS = 1800;

const STATUS_META: Record<
  "scanning" | "opportunity" | "no_opportunity",
  { label: string; dot: string; text: string }
> = {
  scanning: { label: "Scanning", dot: "bg-blue-400 animate-pulse", text: "text-blue-400" },
  opportunity: { label: "Opportunity Found", dot: "bg-emerald-400 animate-pulse", text: "text-emerald-400" },
  no_opportunity: { label: "No Opportunity", dot: "bg-zinc-600", text: "text-zinc-500" },
};

type Props = {
  engine: EngineDef;
  status: ScannerStatus | undefined;
};

export default function OptionsEngineCard({ engine, status }: Props) {
  const [animating, setAnimating] = useState(true);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const phrases = ACTIVITY_PHRASES[engine.id];

  // A fresh server report (last_scan_time changed) restarts the animation —
  // reset during render (state-adjustment-on-prop-change pattern, same as
  // useSpotFuturesTicker's symbol-change reset) rather than as a synchronous
  // setState at the top of an effect body.
  const [trackedScanTime, setTrackedScanTime] = useState(status?.last_scan_time);

  if (status?.last_scan_time !== trackedScanTime) {
    setTrackedScanTime(status?.last_scan_time);
    setAnimating(true);
    setPhraseIndex(0);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, ANIMATION_MS / phrases.length);

    const timeout = setTimeout(() => setAnimating(false), ANIMATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedScanTime]);

  const settledStatus = status?.status ?? "scanning";
  const displayStatus = animating ? "scanning" : settledStatus;
  const meta = STATUS_META[displayStatus];

  const activityLine = animating
    ? phrases[phraseIndex]
    : settledStatus === "opportunity"
      ? "Opportunity detected."
      : "No opportunity.";

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111111] p-4 shadow-2xl shadow-black/40 transition-colors hover:border-blue-500/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold tracking-wide text-white">{engine.title}</h3>
          <InfoButton
            slug={engine.infoSlug}
            className="text-zinc-600 transition-colors hover:text-blue-400"
            iconClassName="h-3.5 w-3.5"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.text}`}>{meta.label}</span>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {engine.algorithms.map((algorithm) => (
          <span key={algorithm} className="rounded-full border border-zinc-800 bg-[#181818] px-2 py-0.5 text-[10px] text-zinc-400">
            {algorithm}
          </span>
        ))}
      </div>

      <div className="mt-3 h-4 font-mono text-xs text-zinc-500">{activityLine}</div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Scanned" value={String(status?.contracts_scanned ?? 0)} />
        <MiniStat label="Found" value={String(status?.opportunities_count ?? 0)} />
        <MiniStat label="Last Scan" value={status?.last_scan_time ?? "—"} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#181818] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="mt-0.5 truncate font-mono text-xs font-semibold text-white">{value}</div>
    </div>
  );
}
