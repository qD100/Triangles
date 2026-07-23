"use client";

import { useMemo, useState } from "react";
import { InfoTooltip } from "./InfoTooltip";
import type { TooltipContent } from "./tooltip-content";

export interface ColumnDef<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string | null;
  info?: TooltipContent;
}

interface OpportunityTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchValue?: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  updatedAt: string;
  defaultSortKey?: string;
  pageSize?: number;
  rowClassName?: (row: T) => string;
}

export default function OpportunityTable<T>({
  columns,
  rows,
  rowKey,
  searchValue,
  onRowClick,
  selectedKey,
  updatedAt,
  defaultSortKey,
  pageSize = 50,
  rowClassName,
}: OpportunityTableProps<T>) {
  const [sortKey, setSortKey] = useState(defaultSortKey ?? columns[0]?.key);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const filtered = useMemo(() => {
    if (!search || !searchValue) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => searchValue(r).toLowerCase().includes(q));
  }, [rows, search, searchValue]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const withKeys = filtered.map((row) => ({ row, v: col.sortValue!(row) }));
    withKeys.sort((a, b) => {
      if (a.v === null && b.v === null) return 0;
      if (a.v === null) return 1;
      if (b.v === null) return -1;
      if (a.v < b.v) return sortDir === "asc" ? -1 : 1;
      if (a.v > b.v) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return withKeys.map((w) => w.row);
  }, [filtered, columns, sortKey, sortDir]);

  const visible = sorted.slice(0, visibleCount);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="rounded-md border border-zinc-800">
      {searchValue && (
        <div className="border-b border-zinc-800 bg-[#111111] px-2 py-1.5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter…"
            className="w-full max-w-xs rounded bg-[#181818] px-2 py-1 text-xs text-white outline-none placeholder:text-zinc-500"
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#111111] text-[10px] uppercase tracking-wide text-zinc-500">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortValue ? () => handleSort(col.key) : undefined}
                  className={`px-3 py-2 font-medium ${col.align === "right" ? "text-right" : "text-left"} ${col.sortValue ? "cursor-pointer select-none hover:text-zinc-400" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    <span>
                      {col.label}
                      {sortKey === col.key && (sortDir === "asc" ? " ▲" : " ▼")}
                    </span>
                    {col.info && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <InfoTooltip content={col.info}>
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] leading-none text-zinc-600 hover:text-zinc-300">
                            ⓘ
                          </span>
                        </InfoTooltip>
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {/* keyed by updatedAt so the whole body remounts on refresh, replaying
              the row-flash CSS animation without any JS timer/state */}
          <tbody key={updatedAt}>
            {visible.map((row) => {
              const key = rowKey(row);
              const isSelected = selectedKey === key;
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`row-flash border-b border-zinc-800 last:border-0 ${
                    onRowClick ? "cursor-pointer hover:bg-[#181818]" : ""
                  } ${isSelected ? "bg-zinc-800/60" : ""} ${rowClassName?.(row) ?? ""}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-1.5 tabular-nums text-zinc-300 ${col.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-800 bg-[#111111] px-3 py-1.5 text-[11px] text-zinc-500">
        <span>
          Showing {Math.min(visibleCount, sorted.length)} of {sorted.length}
          {sorted.length !== rows.length ? ` (filtered from ${rows.length})` : ""}
        </span>
        {visibleCount < sorted.length && (
          <button
            onClick={() => setVisibleCount((c) => c + pageSize)}
            className="rounded px-2 py-0.5 text-blue-400 hover:bg-[#181818]"
          >
            Show more
          </button>
        )}
      </div>
    </div>
  );
}
