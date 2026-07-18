"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FunnelIcon } from "../icons";
import RadarLoader from "./RadarLoader";

export type ScannerEvent = {
  id: string;
  time: string;
  path: string;
  profit: number;
  live: boolean;
};

type Props = {
  events?: ScannerEvent[];
};

export default function ScannerFeed({
  events = [],
}: Props) {
  const [liveOnly, setLiveOnly] = useState(false);

  const visibleEvents = liveOnly ? events.filter((event) => event.live) : events;

  return (
    <section className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40 sm:h-[640px] lg:h-[820px]">

      {/* Header */}

      <div className="border-b border-zinc-800 p-5">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-xl font-bold tracking-wide text-emerald-400">
              LIVE SCANNER
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Latest detected triangular arbitrage opportunities
            </p>

          </div>

          <button
            type="button"
            onClick={() => setLiveOnly((value) => !value)}
            aria-pressed={liveOnly}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide transition-colors ${
              liveOnly
                ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                : "border-zinc-800 bg-[#181818] text-zinc-400 hover:text-white"
            }`}
          >
            <FunnelIcon className="h-3.5 w-3.5" />
            FILTERS
          </button>

        </div>

      </div>

      {/* Column header */}

      {visibleEvents.length > 0 && (
        <div className="hidden items-center gap-4 border-b border-zinc-800/60 px-5 py-2 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase sm:flex">
          <span className="w-20 shrink-0">Time</span>
          <span className="flex-1">Path</span>
          <span className="shrink-0">Profit</span>
        </div>
      )}

      {/* Feed */}

      <div className="flex flex-1 flex-col overflow-y-auto px-2 pb-2">

        {visibleEvents.length === 0 ? (

          <EmptyFeed />

        ) : (

          <AnimatePresence initial={false}>

            {visibleEvents.map((event) => (
              <ScannerRow
                key={event.id}
                event={event}
              />
            ))}

          </AnimatePresence>

        )}

      </div>

      {/* Invisible spacer matching Route Animation's scanning strip,
          so both panels' empty states center on the same line */}

      <div className="invisible border-t border-zinc-800 bg-[#101010] p-4" aria-hidden="true">

        <div className="flex items-center justify-center gap-3 rounded-lg border border-zinc-800 px-4 py-3">
          <span className="h-2 w-2 rounded-full" />
          <span className="text-xs font-bold uppercase tracking-widest">Scanning</span>
          <span className="font-mono text-sm">0 / 0 pairs</span>
        </div>

      </div>

    </section>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">

      <RadarLoader />

      <div className="text-xl font-semibold text-white">
        Waiting for opportunities...
      </div>

      <div className="mt-2 text-sm text-zinc-500">
        Scanner is connected and monitoring Binance.
      </div>

    </div>
  );
}

function ScannerRow({
  event,
}: {
  event: ScannerEvent;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-1.5 rounded-lg px-3 py-3 transition-colors hover:bg-[#181818] sm:flex-row sm:items-center sm:gap-4"
    >

      <div className="flex items-center justify-between gap-3 sm:w-20 sm:shrink-0 sm:flex-col sm:items-start sm:justify-center sm:gap-0">

        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              event.live ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
            }`}
          />
          <span className="text-[10px] font-semibold tracking-wider text-zinc-500">
            {event.live ? "LIVE" : "CLOSED"}
          </span>
          <span className="text-[10px] text-zinc-600 sm:hidden">
            {event.time}
          </span>
        </div>

        <span className="font-mono text-sm font-bold text-emerald-400 sm:hidden">
          +{event.profit.toFixed(5)}%
        </span>

        <div className="hidden text-[10px] text-zinc-600 sm:mt-0.5 sm:block">
          {event.time}
        </div>

      </div>

      <div className="truncate font-mono text-sm text-white sm:flex-1">
        {event.path}
      </div>

      <div className="hidden shrink-0 text-right font-mono text-sm font-bold text-emerald-400 sm:block">
        +{event.profit.toFixed(5)}%
      </div>

    </motion.div>
  );
}
