"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { GearIcon, ExpandIcon, CollapseIcon, TriangleLogoIcon } from "./icons";
import SettingsPanel from "./SettingsPanel";
import ArbitrageLauncher from "./ArbitrageLauncher";
import InfoButton from "./InfoButton";
import type { ScannerSettings } from "./hooks/useArbitrage";

type Props = {
  connected?: boolean;
  opportunitiesPerMin?: number;
  bestProfit?: number;
  lastUpdate?: string | null;
  settings: ScannerSettings;
  onUpdateSettings: (next: ScannerSettings) => void;
};

export default function Header({
  connected = false,
  opportunitiesPerMin = 0,
  bestProfit = 0,
  lastUpdate = null,
  settings,
  onUpdateSettings,
}: Props) {
  const [currentTime, setCurrentTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };

    updateClock();

    const timer = setInterval(updateClock, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#111111]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-3 sm:h-16 sm:px-6 lg:px-8">
        {/* LEFT */}

        <div className="flex items-center gap-2 sm:gap-3">
          <ArbitrageLauncher />

          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3"
            title="Back to homepage"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 transition-colors hover:bg-blue-500/30 sm:h-10 sm:w-10">
              <TriangleLogoIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>

            <h1 className="whitespace-nowrap text-sm font-bold tracking-wide text-white sm:text-xl">
              Triangle Terminal
            </h1>
          </Link>

          <div className="ml-0.5 flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 sm:ml-1 sm:gap-1.5 sm:px-2.5 sm:py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />

            <span className="text-[9px] font-bold tracking-wider text-emerald-400 sm:text-[11px]">
              LIVE
            </span>
          </div>
        </div>

        {/* CENTER / RIGHT STATS */}

        <div className="hidden items-center gap-8 md:flex">
          <StatBlock label="Opportunities / min" value={String(opportunitiesPerMin)} />

          <StatBlock
            label="Best Profit"
            value={`+${bestProfit.toFixed(3)}%`}
            color="green"
          />

          <StatBlock label="Last Update" value={lastUpdate ?? currentTime} mono />
        </div>

        {/* ACTIONS */}

        <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
          <InfoButton slug="triangular-arbitrage" />

          <button
            type="button"
            aria-label="Settings"
            onClick={() => setSettingsOpen((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#181818] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white sm:h-9 sm:w-9"
          >
            <GearIcon />
          </button>

          {settingsOpen && (
            <SettingsPanel
              settings={settings}
              onUpdate={onUpdateSettings}
              onClose={() => setSettingsOpen(false)}
            />
          )}

          <button
            type="button"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#181818] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white sm:h-9 sm:w-9"
          >
            {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}

function StatBlock({
  label,
  value,
  color = "white",
  mono = false,
}: {
  label: string;
  value: string;
  color?: "white" | "green";
  mono?: boolean;
}) {
  return (
    <div className="text-right">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18 }}
          className={`text-sm font-semibold ${
            color === "green" ? "text-emerald-400" : "text-white"
          } ${mono ? "font-mono" : ""}`}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
