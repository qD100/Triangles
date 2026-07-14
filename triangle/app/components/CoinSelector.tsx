"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon } from "./icons";

export type SelectableCoin = {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  icon: ReactNode;
};

type Props = {
  coins: SelectableCoin[];
  selectedId: string;
  onSelect: (coin: SelectableCoin) => void;
};

// Generic instrument switcher — takes a coin list + selection + callback and
// renders its own trigger and dropdown. Not aware of "crypto" beyond the
// SelectableCoin shape, so any future scanner can reuse it with its own list.
export default function CoinSelector({ coins, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = coins.find((coin) => coin.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coins;

    return coins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q)
    );
  }, [coins, query]);

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

    const focusTimer = setTimeout(() => searchRef.current?.focus(), 60);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [open]);

  function toggle() {
    setOpen((value) => {
      const next = !value;
      if (next) setQuery("");
      return next;
    });
  }

  function handleSelect(coin: SelectableCoin) {
    setOpen(false);
    onSelect(coin);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="-m-2 flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/5"
      >
        {selected?.icon}

        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              {selected?.name ?? "Select instrument"}
            </h1>

            <ChevronDownIcon
              className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>

          {selected && (
            <div className="flex items-center gap-2">
              <span className="text-sm uppercase tracking-wide text-zinc-500">
                {selected.symbol}
              </span>
              <span className="text-xs text-zinc-600">Rank #{selected.rank}</span>
            </div>
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-2 w-[min(90vw,340px)] overflow-hidden rounded-xl border border-zinc-800 bg-[#181818] shadow-2xl shadow-black/50"
          >
            <div className="border-b border-zinc-800 p-3">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search coin..."
                className="w-full rounded-lg border border-zinc-700 bg-[#111111] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <div className="p-4 text-center text-sm text-zinc-500">No coins found.</div>
              )}

              {filtered.map((coin) => (
                <button
                  key={coin.id}
                  type="button"
                  role="option"
                  aria-selected={coin.id === selectedId}
                  onClick={() => handleSelect(coin)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    coin.id === selectedId ? "bg-blue-500/15" : "hover:bg-white/5"
                  }`}
                >
                  {coin.icon}

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{coin.name}</div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">{coin.symbol}</div>
                  </div>

                  <div className="shrink-0 text-xs text-zinc-600">Rank #{coin.rank}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
