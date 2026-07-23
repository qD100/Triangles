"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { PairsScannerResult, PairDetail } from "@/lib/tasi/pairs-scanner";

const REFRESH_INTERVAL_MS = 60_000;

export interface SelectedPair {
  a: string;
  b: string;
}

export function usePairsScanner(initialData: PairsScannerResult) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedPair, setSelectedPair] = useState<SelectedPair | null>(
    initialData.rows[0]
      ? { a: initialData.rows[0].symbolA, b: initialData.rows[0].symbolB }
      : null,
  );
  const [detail, setDetail] = useState<PairDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailPending, startDetailTransition] = useTransition();

  const refresh = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/tasi/pairs-scanner", { cache: "no-store" });
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

  useEffect(() => {
    if (!selectedPair) return;
    let cancelled = false;
    const params = new URLSearchParams({ a: selectedPair.a, b: selectedPair.b });

    startDetailTransition(async () => {
      try {
        const res = await fetch(`/api/tasi/pairs-scanner/detail?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load pair detail");
        if (!cancelled) {
          setDetail(json);
          setDetailError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : "Failed to load pair detail");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedPair]);

  return {
    data,
    isPending,
    error,
    refresh,
    selectedPair,
    setSelectedPair,
    detail,
    detailLoading: isDetailPending,
    detailError,
  };
}
