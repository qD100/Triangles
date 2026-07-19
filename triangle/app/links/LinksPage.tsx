"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Globe } from "lucide-react";
import { SiInstagram, SiSnapchat, SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { TriangleLogoIcon } from "@/app/components/icons";

type LinkItem = {
  label: string;
  handle: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
};

const LINKS: LinkItem[] = [
  {
    label: "TikTok",
    handle: "@1plusr",
    href: "https://www.tiktok.com/@1plusr",
    icon: SiTiktok,
    color: "#25F4EE",
  },
  {
    label: "YouTube",
    handle: "@Colonel-Ezo",
    href: "https://www.youtube.com/@Colonel-Ezo",
    icon: SiYoutube,
    color: "#FF0000",
  },
  {
    label: "Instagram",
    handle: "@5usdc",
    href: "https://www.instagram.com/5usdc/",
    icon: SiInstagram,
    color: "#E4405F",
  },
  {
    label: "X",
    handle: "@bobo212170",
    href: "https://x.com/bobo212170",
    icon: SiX,
    color: "#FFFFFF",
  },
  {
    label: "Snapchat",
    handle: "@euggre",
    href: "https://www.snapchat.com/@euggre?invite_id=VivNNdFt&locale=en_SA%40calendar%3Dgregorian&share_id=35xmwBfLQ9ygjsmVi-BTAQ&sid=e6a96063271744f8990761b3bdfca5db",
    icon: SiSnapchat,
    color: "#FFFC00",
  },
  {
    label: "My Company",
    handle: "alahmadiforit.com",
    href: "https://www.alahmadiforit.com/",
    icon: Globe,
    color: "#3B82F6",
  },
];

const MATH_SYMBOLS = ["∆", "Σ", "√", "π", "∞", "∫"];

function useCountUp(target: number, durationMs = 1600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

export default function LinksPage() {
  const followers = useCountUp(3000);

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <style>{BACKGROUND_CSS}</style>

      {/* Ambient scanner/terminal background — grid, sweeping scan line, drifting math symbols.
          z-0 (not a negative z-index) with its own bg color: a negative-z-index child paints
          BEHIND its parent's own background per CSS stacking rules, which would make all of
          this invisible if the parent above also carried the page background color. */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#090909]">
        <div className="lk-grid" />
        <div className="lk-scanline" />
        {MATH_SYMBOLS.map((sym, i) => (
          <span
            key={sym}
            className="lk-symbol"
            style={{
              left: `${8 + i * 16}%`,
              animationDelay: `${i * 1.7}s`,
              animationDuration: `${14 + i * 2}s`,
            }}
          >
            {sym}
          </span>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#090909]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400"
        >
          <span className="lk-logo-ring" />
          <TriangleLogoIcon className="h-9 w-9" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl"
        >
          @1plusr
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mt-3 flex items-center gap-2 rounded-full border border-zinc-800 bg-[#111111] px-3 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold text-emerald-400">
            {followers.toLocaleString()}
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            TikTok Followers
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.26 }}
          className="mt-4 text-sm text-zinc-500"
        >
          All my links in one place.
        </motion.p>

        <div className="mt-9 flex w-full flex-col gap-3">
          {LINKS.map((item, i) => (
            <motion.a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.32 + i * 0.06 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="lk-link-card flex items-center gap-4 rounded-xl border border-zinc-800 bg-[#111111] px-4 py-3.5 transition-colors"
              style={{ "--brand-color": item.color } as React.CSSProperties}
            >
              <div className="lk-link-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#181818] text-zinc-300 transition-colors">
                <item.icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                    {item.label}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-sm text-white">{item.handle}</div>
              </div>

              <ArrowUpRight className="lk-link-arrow h-4 w-4 shrink-0 text-zinc-600 transition-all" />
            </motion.a>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-12"
        >
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-400"
          >
            <TriangleLogoIcon className="h-3 w-3" />
            Powered by Triangle Terminal
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

const BACKGROUND_CSS = `
.lk-grid {
  position: absolute;
  inset: -10%;
  background-image:
    linear-gradient(to right, rgba(59, 130, 246, 0.14) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(59, 130, 246, 0.14) 1px, transparent 1px);
  background-size: 42px 42px;
  animation: lk-grid-drift 30s linear infinite;
}
@keyframes lk-grid-drift {
  from { transform: translate(0, 0); }
  to { transform: translate(42px, 42px); }
}

.lk-scanline {
  position: absolute;
  left: 0;
  right: 0;
  height: 180px;
  background: linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.18), transparent);
  animation: lk-scan-sweep 9s ease-in-out infinite;
}
@keyframes lk-scan-sweep {
  0% { top: -20%; }
  50% { top: 100%; }
  100% { top: -20%; }
}

.lk-symbol {
  position: absolute;
  top: 100%;
  font-size: 38px;
  font-family: 'Georgia', serif;
  color: rgba(59, 130, 246, 0.32);
  animation-name: lk-symbol-float;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes lk-symbol-float {
  0% { top: 105%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: -10%; opacity: 0; }
}

.lk-link-card:hover {
  border-color: color-mix(in srgb, var(--brand-color) 45%, transparent);
  background-color: #161616;
}
.lk-link-card:hover .lk-link-icon,
.lk-link-card:hover .lk-link-arrow {
  color: var(--brand-color);
}
.lk-link-card:hover .lk-link-arrow {
  transform: translate(2px, -2px);
}

.lk-logo-ring {
  position: absolute;
  inset: -6px;
  border-radius: 1rem;
  border: 1px solid rgba(59, 130, 246, 0.4);
  animation: lk-ring-pulse 2.4s ease-in-out infinite;
}
@keyframes lk-ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.12); opacity: 0; }
}
`;
