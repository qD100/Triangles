"use client";

import { BoltIcon } from "../icons";
import { useJitter } from "./useCountUp";

export default function HomeStatusBar() {
  const latency = useJitter(24, 6, 3000);

  return (
    <footer className="sticky bottom-0 z-40 border-t border-white/6 bg-[#05070B]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-1.5 px-4 py-2.5 text-[11px] sm:px-6 lg:px-10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#18D26E] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#18D26E]" />
          </span>
          <span className="font-semibold text-[#18D26E]">LIVE</span>
          <span className="text-zinc-500">All systems operational</span>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-500">
          <BoltIcon className="h-3 w-3 text-[#2F80FF]" />
          Data updated every second
        </div>

        <div className="flex items-center gap-5">
          <span className="text-zinc-500">
            Latency <span className="font-mono font-semibold text-[#18D26E]">{Math.max(9, latency)}ms</span>
          </span>
          <span className="hidden text-zinc-500 sm:inline">
            API Status <span className="font-semibold text-[#18D26E]">Healthy</span>
          </span>
          <span className="hidden text-zinc-500 md:inline">
            WebSocket <span className="font-semibold text-[#18D26E]">Connected</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
