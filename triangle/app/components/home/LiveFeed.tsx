"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ACCENTS } from "./scanners-config";

type FeedRow = {
  id: string;
  time: string;
  scannerLabel: string;
  accent: keyof typeof ACCENTS;
  instrument: string;
  right: { kind: "profit"; value: string } | { kind: "signal"; label: string; score: number };
};

const TEMPLATES: Omit<FeedRow, "id" | "time">[] = [
  { scannerLabel: "Triangular Arbitrage", accent: "green", instrument: "BTC → ETH → SOL → BTC", right: { kind: "profit", value: "+0.42%" } },
  { scannerLabel: "Pairs Trading", accent: "blue", instrument: "1120 / 1080", right: { kind: "signal", label: "Diverged Below Mean", score: 91 } },
  { scannerLabel: "Spot-Future Arbitrage", accent: "purple", instrument: "ETH/USDT Perp", right: { kind: "profit", value: "+0.31%" } },
  { scannerLabel: "ETF vs TASI", accent: "teal", instrument: "KSA30 ETF vs TASI Index", right: { kind: "profit", value: "+0.27%" } },
  { scannerLabel: "Options Arbitrage", accent: "orange", instrument: "Box Spread (BTC)", right: { kind: "profit", value: "+0.18%" } },
  { scannerLabel: "Triangular Arbitrage", accent: "green", instrument: "USDT → BNB → ETH → USDT", right: { kind: "profit", value: "+0.24%" } },
  { scannerLabel: "Pairs Trading", accent: "blue", instrument: "2222 / 1180", right: { kind: "signal", label: "Diverged Above Mean", score: 84 } },
];

function timeNow() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export default function LiveFeed() {
  const [rows, setRows] = useState<FeedRow[]>(() =>
    TEMPLATES.slice(0, 5).map((t, i) => ({ ...t, id: `seed-${i}`, time: timeNow() })),
  );

  useEffect(() => {
    const id = setInterval(() => {
      const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      setRows((prev) => [{ ...template, id: `${Date.now()}`, time: timeNow() }, ...prev].slice(0, 6));
    }, 5000);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/6 bg-[#0B1220] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#18D26E] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#18D26E]" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Live Opportunity Feed</span>
        </div>
        <Link href="/tasi" className="text-[11px] font-medium text-[#2F80FF] hover:text-[#5b9bff]">
          View All Opportunities →
        </Link>
      </div>

      <div className="mt-3 flex-1 space-y-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {rows.map((row) => {
            const accent = ACCENTS[row.accent];
            return (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-[12px] hover:bg-white/[0.03]"
              >
                {/* Wall-clock time is only ever meaningful client-side; the second
                    it renders can legitimately differ from the SSR pass, so this
                    is the one spot where a hydration mismatch is expected and safe. */}
                <span suppressHydrationWarning className="w-[70px] shrink-0 font-mono text-zinc-600">
                  {row.time}
                </span>
                <span className={`w-[150px] shrink-0 truncate font-medium ${accent.text}`}>{row.scannerLabel}</span>
                <span className="flex-1 truncate text-zinc-400">{row.instrument}</span>
                {row.right.kind === "profit" ? (
                  <span className="shrink-0 font-mono font-semibold text-[#18D26E]">{row.right.value}</span>
                ) : (
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${accent.border} ${accent.text}`}>
                      {row.right.label}
                    </span>
                    <span className="hidden font-mono text-zinc-600 sm:inline">Score: {row.right.score}</span>
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
