"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Tailwind's compiler only picks up class names it can see written out in
// full, so each accent's classes are spelled out here rather than built
// from a `${accent}-500/40`-style template string (which it can't scan).
const ACCENTS = {
  blue: {
    border: "group-hover:border-blue-500/40 group-focus-visible:border-blue-500/60",
    ring: "group-focus-visible:ring-blue-500/40",
    iconBg: "bg-blue-500/15",
  },
  rose: {
    border: "group-hover:border-rose-500/40 group-focus-visible:border-rose-500/60",
    ring: "group-focus-visible:ring-rose-500/40",
    iconBg: "bg-rose-500/15",
  },
  amber: {
    border: "group-hover:border-amber-500/40 group-focus-visible:border-amber-500/60",
    ring: "group-focus-visible:ring-amber-500/40",
    iconBg: "bg-amber-500/15",
  },
} as const;

export type CasinoGame = {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  accent: keyof typeof ACCENTS;
};

export default function GameCard({ game }: { game: CasinoGame }) {
  const accent = ACCENTS[game.accent];

  return (
    <Link href={game.href} className="group block rounded-2xl focus:outline-none">
      <motion.div
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={`flex h-full flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-[#111111] p-8 text-center shadow-lg shadow-black/20 transition-colors group-hover:bg-[#161616] group-focus-visible:outline-none group-focus-visible:ring-2 ${accent.border} ${accent.ring}`}
      >
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-xl text-4xl transition-transform group-hover:scale-110 ${accent.iconBg}`}
        >
          {game.icon}
        </div>

        <div className="text-lg font-bold text-white">{game.title}</div>

        <div className="text-sm leading-snug text-zinc-500">{game.description}</div>
      </motion.div>
    </Link>
  );
}
