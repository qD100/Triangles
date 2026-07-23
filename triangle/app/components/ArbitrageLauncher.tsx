"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { GridIcon, TriangleLogoIcon, TargetIcon, OptionsIcon, TasiMarkIcon } from "./icons";

export type ArbitrageTool = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  // A plain string for a fixed destination, or a function resolved at click
  // time for a tool that should remember where you left it (e.g. Spot /
  // Futures reopens whichever coin you last had selected there).
  route: string | (() => string);
};

// Session-persisted instrument for the Spot/Futures terminal — read here so
// the launcher's tile reopens the coin you last had selected there, not
// always Bitcoin. Written by the coin page itself on every symbol change.
export const LAST_SPOTFUTURES_SYMBOL_KEY = "spotfutures:lastSymbol";

export function resolveSpotFuturesRoute() {
  if (typeof window === "undefined") return "/coin/btc";

  try {
    const stored = window.sessionStorage.getItem(LAST_SPOTFUTURES_SYMBOL_KEY);
    return `/coin/${(stored ?? "btc").toLowerCase()}`;
  } catch {
    return "/coin/btc";
  }
}

// Adding a new scanner is just appending one entry here — the launcher
// renders its grid from this list, nothing else needs to change.
export const ARBITRAGE_TOOLS: ArbitrageTool[] = [
  {
    id: "triangular",
    title: "Triangular Arbitrage",
    description: "Cross-market pricing errors",
    icon: TriangleLogoIcon,
    route: "/triangular-arbitrage",
  },
  {
    id: "spot-futures",
    title: "Spot / Futures",
    description: "Cash-and-carry opportunities",
    icon: TargetIcon,
    route: resolveSpotFuturesRoute,
  },
  {
    id: "options",
    title: "Options Arbitrage",
    description: "Option pricing inefficiencies",
    icon: OptionsIcon,
    route: "/options-arbitrage",
  },
  {
    id: "tasi",
    title: "TASI Scanner",
    description: "Saudi ETF & pairs arbitrage",
    icon: TasiMarkIcon,
    route: "/tasi",
  },
];

export default function ArbitrageLauncher() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function select(tool: ArbitrageTool) {
    setOpen(false);
    router.push(typeof tool.route === "function" ? tool.route() : tool.route);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Arbitrage tools"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#181818] transition-colors sm:h-9 sm:w-9 ${
          open ? "border-zinc-700 text-white" : "text-zinc-400 hover:border-zinc-700 hover:text-white"
        }`}
      >
        <GridIcon className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-12 z-50 w-[min(92vw,380px)] rounded-xl border border-zinc-800 bg-[#181818] p-4 shadow-2xl shadow-black/50"
          >
            <div className="text-sm font-bold uppercase tracking-wide text-white">
              Arbitrage Tools
            </div>

            <p className="mt-1 text-xs text-zinc-500">Choose a scanner</p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ARBITRAGE_TOOLS.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onSelect={() => select(tool)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolCard({ tool, onSelect }: { tool: ArbitrageTool; onSelect: () => void }) {
  const Icon = tool.icon;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.94 }}
      className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-[#111111] p-3 text-center transition-all hover:-translate-y-0.5 hover:border-blue-500/40 hover:bg-[#161616] hover:shadow-lg hover:shadow-blue-500/10"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 transition-colors group-hover:bg-blue-500/25">
        <Icon className="h-5 w-5" />
      </div>

      <div className="text-xs font-semibold text-white">{tool.title}</div>
      <div className="text-[10px] leading-tight text-zinc-500">{tool.description}</div>
    </motion.button>
  );
}
