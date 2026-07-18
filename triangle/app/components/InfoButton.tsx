import Link from "next/link";
import { Info } from "lucide-react";
import type { InfoDocSlug } from "@/app/data/infoDocs";

type Props = {
  slug: InfoDocSlug;
  className?: string;
  iconClassName?: string;
};

// Chrome-button look by default (matches the settings/fullscreen icon
// buttons already used in these headers) — pass className to override for
// a more compact inline placement, e.g. next to a card title.
const DEFAULT_CLASSNAME =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#181818] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white sm:h-9 sm:w-9";

export default function InfoButton({ slug, className, iconClassName = "h-4 w-4" }: Props) {
  return (
    <Link
      href={`/info/${slug}`}
      aria-label="View scanner documentation"
      title="View scanner documentation"
      className={className ?? DEFAULT_CLASSNAME}
    >
      <Info className={iconClassName} />
    </Link>
  );
}
