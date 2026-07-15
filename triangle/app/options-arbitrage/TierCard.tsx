import Link from "next/link";
import type { OptionsTier } from "./tiers";

export default function TierCard({ tier }: { tier: OptionsTier }) {
  return (
    <Link
      href={tier.href}
      className="group flex flex-col gap-4 rounded-xl border border-zinc-800 bg-[#111111] p-5 shadow-2xl shadow-black/40 transition-all hover:-translate-y-1 hover:border-blue-500/40 hover:bg-[#161616] hover:shadow-lg hover:shadow-blue-500/10 focus:outline-none focus-visible:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-sm font-bold text-blue-400 transition-colors group-hover:bg-blue-500/25">
          {tier.number}
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Tier {tier.number}
          </div>
          <div className="text-base font-bold text-white">{tier.name}</div>
        </div>
      </div>

      <ul className="space-y-1.5">
        {tier.scanners.map((scanner) => (
          <li key={scanner} className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="h-1 w-1 shrink-0 rounded-full bg-blue-400" />
            {scanner}
          </li>
        ))}
      </ul>

      <p className="mt-auto text-xs leading-relaxed text-zinc-500">{tier.description}</p>
    </Link>
  );
}
