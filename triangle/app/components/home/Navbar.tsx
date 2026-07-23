"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { TriangleLogoIcon, ChevronDownIcon } from "../icons";
import { HOME_SCANNERS, ACCENTS, resolveRoute } from "./scanners-config";
import { useHoverReveal, HOVER_REVEAL_CSS } from "./HoverReveal";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Analytics", href: "/tasi?tab=analytics" },
  { label: "Documentation", href: "/docs" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [scannersOpen, setScannersOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const nameRef = useRef<HTMLSpanElement>(null);
  const linksRef = useRef<HTMLAnchorElement>(null);
  const nameReveal = useHoverReveal(nameRef);
  const linksReveal = useHoverReveal(linksRef);

  useEffect(() => {
    if (!scannersOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setScannersOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [scannersOpen]);

  function openScanner(route: string | (() => string)) {
    setScannersOpen(false);
    setMobileOpen(false);
    router.push(resolveRoute(route));
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-[#05070B]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-10">
        <style>{HOVER_REVEAL_CSS}</style>

        <div className="flex min-w-0 shrink items-center gap-3">
          <Link href="/" className="flex min-w-0 shrink items-center gap-2 overflow-hidden sm:gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2F80FF] to-[#1a4fc4] text-white shadow-[0_0_20px_-4px_#2F80FF]">
              <TriangleLogoIcon className="h-4.5 w-4.5" />
            </div>
            <span className="min-w-0 max-w-[150px] truncate text-base font-extrabold tracking-tight text-white sm:max-w-none sm:text-lg">
              SUPERSONIC<span className="text-[#2F80FF]">SCAN</span>
            </span>
          </Link>

          <span
            ref={nameRef}
            onMouseMove={nameReveal.onMouseMove}
            onMouseEnter={nameReveal.onMouseEnter}
            onMouseLeave={nameReveal.onMouseLeave}
            className="hover-reveal-text hidden shrink-0 select-none whitespace-nowrap font-mono text-xs text-zinc-500 lg:inline-block"
          >
            By Qosay Alahmadi
          </span>

          <Link
            href="/links"
            ref={linksRef}
            onMouseMove={linksReveal.onMouseMove}
            onMouseEnter={linksReveal.onMouseEnter}
            onMouseLeave={linksReveal.onMouseLeave}
            className="hover-reveal-text hidden shrink-0 whitespace-nowrap font-mono text-xs font-semibold text-[#2F80FF] lg:inline-block"
          >
            Links
          </Link>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          <Link href="/" className="relative py-2 text-sm font-medium text-[#2F80FF]">
            Home
            <span className="absolute -bottom-[1px] left-0 h-[2px] w-full rounded-full bg-[#2F80FF]" />
          </Link>

          <div ref={containerRef} className="relative">
            <button
              type="button"
              onClick={() => setScannersOpen((v) => !v)}
              className="flex items-center gap-1 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Scanners
              <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${scannersOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {scannersOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute left-1/2 top-11 z-50 w-[320px] -translate-x-1/2 rounded-2xl border border-white/6 bg-[#0B1220]/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl"
                >
                  {HOME_SCANNERS.map((scanner) => {
                    const Icon = scanner.icon;
                    const accent = ACCENTS[scanner.accent];
                    return (
                      <button
                        key={scanner.id}
                        type="button"
                        onClick={() => openScanner(scanner.route)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.bgSoft} ${accent.text}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-white">{scanner.title}</div>
                          <div className="truncate text-[11px] text-zinc-500">{scanner.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {NAV_LINKS.slice(1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/6 bg-white/[0.03] px-3 py-1.5 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#18D26E] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#18D26E]" />
            </span>
            <span className="text-[11px] font-bold tracking-wider text-[#18D26E]">LIVE</span>
            <span className="text-[11px] text-zinc-500">
              Scanners Running: <span className="font-semibold text-zinc-300">{HOME_SCANNERS.length}</span>
            </span>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/6 text-zinc-400 hover:text-white md:hidden"
          >
            {mobileOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/6 md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-2 border-t border-white/6 pt-2">
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  Scanners
                </div>
                {HOME_SCANNERS.map((scanner) => (
                  <button
                    key={scanner.id}
                    type="button"
                    onClick={() => openScanner(scanner.route)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
                  >
                    {scanner.title}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
