"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/app/components/icons";

export type Conditions = {
  minSpreadPercent: number;
  minNetProfitPercent: number;
  autoEntry: boolean;
  autoResetAfterClose: boolean;
};

export const DEFAULT_CONDITIONS: Conditions = {
  minSpreadPercent: 1,
  minNetProfitPercent: 0.5,
  autoEntry: true,
  autoResetAfterClose: true,
};

type Props = {
  conditions: Conditions;
  onChange: (next: Conditions) => void;
};

export default function SpotFuturesConditions({ conditions, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  function updateNumber(key: "minSpreadPercent" | "minNetProfitPercent", raw: string) {
    const value = Number(raw);
    if (Number.isNaN(value)) return;

    onChange({ ...conditions, [key]: value });
  }

  function updateToggle(key: "autoEntry" | "autoResetAfterClose", value: boolean) {
    onChange({ ...conditions, [key]: value });
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#111111] shadow-2xl shadow-black/40">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div>
          <h2 className="text-xl font-bold tracking-wide text-white">CONDITIONS</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Entry rules for the simulated spot/futures position
          </p>
        </div>

        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 border-t border-zinc-800 p-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Minimum Spread (%)
            </span>

            <input
              type="number"
              step="0.01"
              min="0"
              value={conditions.minSpreadPercent}
              onChange={(event) => updateNumber("minSpreadPercent", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#181818] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />

            <span className="mt-1 block text-[11px] text-zinc-600">
              Opens only when (Futures − Spot) / Spot ≥ this value
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
              value={conditions.minNetProfitPercent}
              onChange={(event) => updateNumber("minNetProfitPercent", event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#181818] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />

            <span className="mt-1 block text-[11px] text-zinc-600">
              Spread after estimated trading fees
            </span>
          </label>

          <ToggleRow
            label="Auto Entry"
            description="Automatically open a position once conditions are met"
            checked={conditions.autoEntry}
            onChange={(value) => updateToggle("autoEntry", value)}
          />

          <ToggleRow
            label="Auto Reset After Close"
            description="Resume scanning immediately after a position is reset"
            checked={conditions.autoResetAfterClose}
            onChange={(value) => updateToggle("autoResetAfterClose", value)}
          />
        </div>
      )}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-[#181818] px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300">{label}</div>
        <div className="mt-0.5 text-[11px] text-zinc-600">{description}</div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500/80" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
