"use client";

import type { ScanStatus, ScannerSettings } from "./hooks/useArbitrage";

type Props = {
  connected?: boolean;
  latency?: number;
  scanStatus?: ScanStatus;
  settings?: ScannerSettings;
  uptime?: string;
};

export default function StatusBar({
  connected = false,
  latency = 0,
  scanStatus = { scanned: 0, total: 0 },
  settings = { feePercent: 0.1, minProfitPercent: 0.05 },
  uptime = "00:00:00",
}: Props) {
  return (
    <footer className="sticky bottom-0 z-40 border-t border-zinc-800 bg-[#111111]/90 backdrop-blur">

      <div className="mx-auto flex h-11 max-w-[1800px] items-center justify-between px-8 text-xs">

        <Item label="Connection">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-zinc-300">
            {connected ? "Binance (WSS)" : "Disconnected"}
          </span>
        </Item>

        <Item label="Latency">
          <span className="font-mono text-emerald-400">{latency} ms</span>
        </Item>

        <Item label="Scanned Pairs">
          <span className="font-mono text-zinc-300">
            {scanStatus.scanned.toLocaleString()} / {scanStatus.total.toLocaleString()}
          </span>
        </Item>

        <Item label="Fee">
          <span className="font-mono text-zinc-300">{settings.feePercent.toFixed(2)}%</span>
        </Item>

        <Item label="Min Profit">
          <span className="font-mono text-zinc-300">{settings.minProfitPercent.toFixed(2)}%</span>
        </Item>

        <Item label="Uptime">
          <span className="font-mono text-zinc-300">{uptime}</span>
        </Item>

      </div>

    </footer>
  );
}

function Item({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">

      <span className="uppercase tracking-wider text-zinc-600">
        {label}
      </span>

      <span className="flex items-center gap-1.5">
        {children}
      </span>

    </div>
  );
}
