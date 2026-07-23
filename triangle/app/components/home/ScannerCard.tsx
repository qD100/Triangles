"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ACCENTS, resolveRoute, type HomeScanner } from "./scanners-config";

export default function ScannerCard({
  scanner,
  dashboard,
}: {
  scanner: HomeScanner;
  dashboard: React.ReactNode;
}) {
  const router = useRouter();
  const Icon = scanner.icon;
  const accent = ACCENTS[scanner.accent];

  function open() {
    router.push(resolveRoute(scanner.route));
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative flex flex-col rounded-2xl border border-white/6 bg-[#0B1220] p-5 transition-colors ${accent.hoverBorder}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${accent.glow}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.bgSoft} ${accent.text}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-white">{scanner.title}</h3>
              {scanner.badge && (
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-zinc-300">
                  {scanner.badge}
                </span>
              )}
            </div>
          </div>
        </div>

        <span className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${accent.border} ${accent.text}`}>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className={`h-1.5 w-1.5 rounded-full ${accent.dot}`}
          />
          LIVE
        </span>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-zinc-500">{scanner.description}</p>

      <div className="mt-3 text-[11px] font-medium text-zinc-500">{scanner.scanningLabel}</div>

      <div className="mt-2 flex-1">{dashboard}</div>

      <button
        type="button"
        onClick={open}
        className={`mt-3 w-full rounded-lg border py-2 text-xs font-semibold transition-colors ${accent.border} ${accent.text} ${accent.hoverBgSoft}`}
      >
        Open Scanner
      </button>
    </motion.div>
  );
}
