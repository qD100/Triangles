import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function GlassCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-black/5 bg-white/70 shadow-xl shadow-black/5 backdrop-blur-xl",
        "dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/30",
        className
      )}
      {...props}
    />
  );
}
