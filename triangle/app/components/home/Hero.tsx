"use client";

import { motion } from "framer-motion";
import { BoltIcon } from "../icons";
import RadarVisual from "./RadarVisual";
import SystemStatusCard from "./SystemStatusCard";

function scrollToScanners() {
  document.getElementById("scanners")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-20 sm:pt-20 lg:px-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 70% 10%, rgba(47,128,255,0.16), transparent 70%)",
        }}
      />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full min-w-0 max-w-xl lg:shrink-0"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2F80FF]/25 bg-[#2F80FF]/10 px-3 py-1">
            <BoltIcon className="h-3 w-3 text-[#2F80FF]" />
            <span className="text-[11px] font-bold tracking-wider text-[#2F80FF]">
              REAL-TIME MARKET INTELLIGENCE
            </span>
          </div>

          <h1 className="mt-5 break-words text-[2.25rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[3.25rem]">
            Scan. Detect.
            <br />
            <span className="text-[#2F80FF]">Capture</span> Opportunities.
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-400">
            SuperSonicScan continuously analyzes global markets to find
            arbitrage, statistical edges, and pricing inefficiencies in
            real-time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={scrollToScanners}
              className="group flex items-center gap-2 rounded-xl bg-[#2F80FF] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_28px_-6px_#2F80FF] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_36px_-4px_#2F80FF] active:translate-y-0"
            >
              <BoltIcon className="h-4 w-4" />
              Explore Scanners
            </button>
          </div>
        </motion.div>

        <div className="flex flex-1 flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-8 lg:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full max-w-[220px] sm:max-w-[340px] lg:order-1 lg:max-w-[420px]"
          >
            <RadarVisual />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-[360px] lg:order-2 lg:w-[300px] lg:shrink-0"
          >
            <SystemStatusCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
