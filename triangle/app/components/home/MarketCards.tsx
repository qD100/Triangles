"use client";

import { TreePalm, Bitcoin, Layers, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const MARKETS = [
  {
    icon: TreePalm,
    title: "Saudi Stock Exchange",
    subtitle: "(TASI)",
    detail: "Live Market Data",
    accentText: "text-[#18D26E]",
    accentBgSoft: "bg-[#18D26E]/10",
    accentBorder: "hover:border-[#18D26E]/30",
  },
  {
    icon: Bitcoin,
    title: "Crypto Spot",
    subtitle: "Markets",
    detail: "100+ Exchanges",
    accentText: "text-[#F5A623]",
    accentBgSoft: "bg-[#F5A623]/10",
    accentBorder: "hover:border-[#F5A623]/30",
  },
  {
    icon: Layers,
    title: "Crypto Futures",
    subtitle: "Markets",
    detail: "Global Derivatives",
    accentText: "text-[#8B5CF6]",
    accentBgSoft: "bg-[#8B5CF6]/10",
    accentBorder: "hover:border-[#8B5CF6]/30",
  },
  {
    icon: Share2,
    title: "Options",
    subtitle: "Markets",
    detail: "Options Contracts",
    accentText: "text-[#2F80FF]",
    accentBgSoft: "bg-[#2F80FF]/10",
    accentBorder: "hover:border-[#2F80FF]/30",
  },
];

export default function MarketCards() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/6 bg-[#0B1220] p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Supported Markets</span>
        <Link href="/docs" className="text-[11px] font-medium text-[#2F80FF] hover:text-[#5b9bff]">
          View All Markets →
        </Link>
      </div>

      <div className="mt-3 grid flex-1 grid-cols-2 gap-2.5">
        {MARKETS.map((m) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.title}
              whileHover={{ y: -2 }}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-4 text-center transition-colors ${m.accentBorder}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.accentBgSoft} ${m.accentText}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="text-[12px] font-semibold leading-tight text-white">
                {m.title}
                <br />
                {m.subtitle}
              </div>
              <div className="text-[10px] text-zinc-500">{m.detail}</div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[10px] text-zinc-600">More markets coming soon…</p>
    </div>
  );
}
