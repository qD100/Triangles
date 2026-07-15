"use client";

import { useState } from "react";
import type { SpotFuturesConditions } from "./useSpotFuturesTicker";

type Props = {
  conditions: SpotFuturesConditions;
  onUpdate: (next: SpotFuturesConditions) => void;
  onClose: () => void;
};

export default function PositionSettingsPanel({ conditions, onUpdate, onClose }: Props) {
  const [minSpread, setMinSpread] = useState(String(conditions.min_spread_percent));
  const [minNetProfit, setMinNetProfit] = useState(String(conditions.min_net_profit_percent));
  const [autoEntry, setAutoEntry] = useState(conditions.auto_entry);
  const [autoResetAfterClose, setAutoResetAfterClose] = useState(conditions.auto_reset_after_close);

  function apply() {
    const spread = Number(minSpread);
    const netProfit = Number(minNetProfit);

    if (Number.isNaN(spread) || Number.isNaN(netProfit)) return;

    onUpdate({
      min_spread_percent: spread,
      min_net_profit_percent: netProfit,
      auto_entry: autoEntry,
      auto_reset_after_close: autoResetAfterClose,
    });

    onClose();
  }

  return (
    <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-zinc-800 bg-[#181818] p-4 shadow-2xl shadow-black/50">
      <div className="text-sm font-bold uppercase tracking-wide text-white">
        Position Settings
      </div>

      <p className="mt-1 text-xs text-zinc-500">
        Applied live to the Spot/Futures paper trading engine — shared across
        every connected viewer, not just this browser.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Minimum Spread (%)
          </span>

          <input
            type="number"
            step="0.01"
            min="0"
            value={minSpread}
            onChange={(event) => setMinSpread(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />

          <span className="mt-1 block text-[11px] text-zinc-600">
            Minimum spread required before opening a position.
          </span>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Minimum Expected Net Profit (%)
          </span>

          <input
            type="number"
            step="0.01"
            min="0"
            value={minNetProfit}
            onChange={(event) => setMinNetProfit(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />

          <span className="mt-1 block text-[11px] text-zinc-600">
            Calculated after estimated fees.
          </span>
        </label>

        <ToggleRow label="Auto Entry" checked={autoEntry} onChange={setAutoEntry} />
        <ToggleRow label="Auto Reset" checked={autoResetAfterClose} onChange={setAutoResetAfterClose} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={apply}
          className="rounded-lg border border-blue-500/50 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/25"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500/80" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
