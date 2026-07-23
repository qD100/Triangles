import SignalBadge from "./SignalBadge";
import type { EtfSignal, PairSignal } from "@/lib/tasi/opportunityScore";

export interface SignalFeedItem {
  key: string;
  label: string;
  detail: string;
  signal: EtfSignal | PairSignal;
}

export default function RecentSignalsFeed({ items }: { items: SignalFeedItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-zinc-800 px-3 py-4 text-center text-xs text-zinc-500">
        No active signals right now — everything within normal range.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
          <div>
            <div className="font-medium text-white">{item.label}</div>
            <div className="text-zinc-500">{item.detail}</div>
          </div>
          <SignalBadge signal={item.signal} />
        </li>
      ))}
    </ul>
  );
}
