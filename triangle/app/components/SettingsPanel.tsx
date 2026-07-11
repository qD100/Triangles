"use client";

import { useState } from "react";
import type { ScannerSettings } from "./hooks/useArbitrage";

type Props = {
  settings: ScannerSettings;
  onUpdate: (next: ScannerSettings) => void;
  onClose: () => void;
};

export default function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  const [feePercent, setFeePercent] = useState(String(settings.feePercent));
  const [minProfitPercent, setMinProfitPercent] = useState(
    String(settings.minProfitPercent)
  );

  function apply() {
    const fee = Number(feePercent);
    const minProfit = Number(minProfitPercent);

    if (Number.isNaN(fee) || Number.isNaN(minProfit)) return;

    onUpdate({ feePercent: fee, minProfitPercent: minProfit });
    onClose();
  }

  return (
    <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-zinc-800 bg-[#181818] p-4 shadow-2xl shadow-black/50">

      <div className="text-sm font-bold uppercase tracking-wide text-white">
        Scanner Settings
      </div>

      <p className="mt-1 text-xs text-zinc-500">
        Applied live to the scanner over its websocket connection.
      </p>

      <div className="mt-4 space-y-3">

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Deductible Fee (%)
          </span>

          <input
            type="number"
            step="0.01"
            min="0"
            value={feePercent}
            onChange={(event) => setFeePercent(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Min Profit After Fee (%)
          </span>

          <input
            type="number"
            step="0.01"
            min="0"
            value={minProfitPercent}
            onChange={(event) => setMinProfitPercent(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </label>

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
