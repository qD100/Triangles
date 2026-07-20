"use client";

import { useState } from "react";
import type { OptionsSettings } from "@/app/components/hooks/useOptionsScanner";

type Props = {
  settings: OptionsSettings;
  onUpdate: (next: OptionsSettings) => void;
  onClose: () => void;
  highConfidenceOnly: boolean;
  onHighConfidenceOnlyChange: (value: boolean) => void;
};

export default function OptionsSettingsPanel({
  settings,
  onUpdate,
  onClose,
  highConfidenceOnly,
  onHighConfidenceOnlyChange,
}: Props) {
  const [feePercent, setFeePercent] = useState(String(settings.fee_percent));
  const [minProfitUsd, setMinProfitUsd] = useState(String(settings.min_profit_usd));

  function apply() {
    const fee = Number(feePercent);
    const minProfit = Number(minProfitUsd);

    if (Number.isNaN(fee) || Number.isNaN(minProfit)) return;

    onUpdate({ fee_percent: fee, min_profit_usd: minProfit });
    onClose();
  }

  return (
    <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-zinc-800 bg-[#181818] p-4 shadow-2xl shadow-black/50">
      <div className="text-sm font-bold uppercase tracking-wide text-white">Scanner Settings</div>

      <p className="mt-1 text-xs text-zinc-500">
        Applied live to all three options engines over their websocket connection.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Estimated Fee (%)</span>

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
          <span className="text-xs uppercase tracking-wide text-zinc-500">Min Flagged Edge ($)</span>

          <input
            type="number"
            step="0.5"
            min="0"
            value={minProfitUsd}
            onChange={(event) => setMinProfitUsd(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-3">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={highConfidenceOnly}
            onChange={(event) => onHighConfidenceOnlyChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-[#111111] accent-blue-500"
          />
          <span>
            <span className="block text-xs font-semibold text-white">High confidence only</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
              Hide opportunities priced off a contract with no confirmed real
              bid/ask (medium/low confidence) — filters the feed instantly,
              doesn&apos;t change what the scanners detect.
            </span>
          </span>
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
