"use client";

import { usePathname } from "next/navigation";

export const SYNCODE_URL = "https://syncode.sa";
export const SYNCODE_ARIA_LABEL = "Visit Syncode website";

// Shared site-wide developer credit. In flow (never fixed/sticky) so it can't
// cover content, and `relative z-10` keeps it above the fixed background
// layers that several pages paint behind their content.
export default function SiteFooter() {
  const pathname = usePathname();

  // /links prints its own Syncode credit ("Powered by Syncode — syncode.sa") at
  // the bottom of its card column, so the shared credit is skipped there to
  // avoid stacking two developer credits on the same page.
  if (pathname === "/links") return null;

  return (
    <footer className="relative z-10 mt-auto px-4 py-4">
      <p className="text-center text-[11px] leading-relaxed">
        <a
          href={SYNCODE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={SYNCODE_ARIA_LABEL}
          className="font-medium text-zinc-600 transition-colors duration-200 hover:text-zinc-300 focus-visible:text-zinc-300"
        >
          Designed &amp; Developed by Syncode — syncode.sa
        </a>
      </p>
    </footer>
  );
}
