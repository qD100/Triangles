import { ETF_META } from "./constants";
import type { Allocation, EtfSymbol } from "./types";

export function buildAllocationCsv(allocation: Allocation, symbols: EtfSymbol[]): string {
  const header = "Symbol,Asset,Allocation %";
  const rows = symbols.map(
    (symbol) => `${symbol},"${ETF_META[symbol].fullName}",${allocation[symbol].toFixed(2)}`
  );
  return [header, ...rows].join("\n");
}

export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
