"use client";

import { AnimatePresence, motion } from "framer-motion";
import CoinNode from "./CoinNode";
import { BoltIcon } from "../icons";
import ScanningLoader from "./ScanningLoader";

export type RouteData = {
  id: string;
  route: string[];
  profit: number;
  live: boolean;
};

export type ScanStatus = {
  scanned: number;
  total: number;
};

type Props = {
  data?: RouteData | null;
  scanStatus?: ScanStatus;
};

export default function RouteAnimation({
  data,
  scanStatus = { scanned: 0, total: 0 },
}: Props) {
  return (
    <section className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40 sm:h-[640px] lg:h-[820px]">

      {/* Header */}

      <div className="border-b border-zinc-800 p-5">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <BoltIcon className="h-4 w-4 text-yellow-400" />

            <div>

              <h2 className="text-xl font-bold text-yellow-400">
                ROUTE ANIMATION
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Live visualization of detected arbitrage
              </p>

            </div>

          </div>

          {data && <LiveBadge live={data.live} />}

        </div>

      </div>

      {/* Route */}

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto py-2">

        {!data ? (

          <EmptyState />

        ) : (

          <AnimatePresence mode="wait">

            <motion.div
              key={data.id}
              className="flex flex-col items-center"
            >

              {data.route.map((coin, index) => {

                const isBase = index === 0 || index === data.route.length - 1;

                return (
                  <div key={`${data.id}-${index}`} className="flex flex-col items-center">

                    {index > 0 && <Arrow />}

                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35, delay: index * 0.12 }}
                    >
                      <Rail glow={isBase ? "base" : "route"}>
                        <CoinNode
                          coin={coin}
                          active
                          glow={isBase ? "base" : "route"}
                        />
                      </Rail>
                    </motion.div>

                  </div>
                );

              })}

            </motion.div>

          </AnimatePresence>

        )}

      </div>

      {/* Scanning strip */}

      <ScanningStrip scanStatus={scanStatus} />

    </section>
  );
}

function Rail({
  glow,
  children,
}: {
  glow: "base" | "route";
  children: React.ReactNode;
}) {
  const dotColor = glow === "base" ? "bg-blue-500" : "bg-yellow-400";

  return (
    <div className="flex items-center gap-3">

      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor} opacity-70`} />
        <span className={`h-5 w-5 border-t ${glow === "base" ? "border-blue-500/40" : "border-yellow-400/40"}`} />
      </div>

      {children}

      <div className="flex items-center gap-1.5">
        <span className={`h-5 w-5 border-t ${glow === "base" ? "border-blue-500/40" : "border-yellow-400/40"}`} />
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor} opacity-70`} />
      </div>

    </div>
  );
}

function Arrow() {
  return (

    <div className="my-1 flex flex-col items-center">

      <div className="h-4 w-[2px] rounded-full bg-zinc-700" />

      <div className="text-base leading-none text-yellow-400 animate-pulse">

        ↓

      </div>

    </div>

  );
}

function LiveBadge({
  live,
}:{
  live:boolean;
}){

  if(live){

    return(

      <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold tracking-wider text-emerald-400">

        ● LIVE

      </div>

    )

  }

  return(

    <div className="rounded-full bg-zinc-700/20 px-3 py-1 text-xs text-zinc-500">

      EXPIRED

    </div>

  )

}

function ScanningStrip({
  scanStatus,
}: {
  scanStatus: ScanStatus;
}) {
  return (
    <div className="border-t border-zinc-800 bg-[#101010] p-4">

      <div className="flex items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-[#181818] px-4 py-3">

        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          Scanning
        </span>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${scanStatus.scanned}-${scanStatus.total}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="font-mono text-sm text-white"
          >
            {scanStatus.scanned.toLocaleString()} / {scanStatus.total.toLocaleString()} pairs
          </motion.span>
        </AnimatePresence>

      </div>

    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center">

      <ScanningLoader />

      <div className="text-xl font-semibold text-white">
        Scanner Running
      </div>

      <div className="mt-3 text-center text-zinc-500 max-w-xs">
        No profitable triangular arbitrage opportunity has been detected yet.
      </div>

    </div>
  );
}
