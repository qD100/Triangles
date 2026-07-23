"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { EtfScannerResult } from "@/lib/tasi/etf-scanner";

// Underlying Yahoo fetches are cached server-side (lib/yahoo.ts revalidate
// windows), so polling here doesn't translate into excess upstream calls —
// it just re-reads whatever the server has, which is fresh within ~15 min.
const REFRESH_INTERVAL_MS = 60_000;

export function useETFScanner(initialData: EtfScannerResult) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(
    initialData.rows[0]?.symbol ?? null,
  );

  const refresh = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/tasi/etf-scanner", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to refresh");
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to refresh");
      }
    });
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const selectedRow =
    data.rows.find((r) => r.symbol === selectedSymbol) ?? data.rows[0] ?? null;

  return { data, isPending, error, refresh, selectedSymbol, setSelectedSymbol, selectedRow };
}
