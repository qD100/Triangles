import { TriangleLogoIcon } from "./icons";

// Deliberately no "use client" / framer-motion here: this is a loading.js
// fallback, so the whole point is that it paints and animates immediately
// from the server-streamed HTML, before any JS has hydrated. Tailwind's
// built-in keyframe utilities (animate-ping/animate-bounce) run on pure CSS.
export default function RouteLoading({ label = "Loading scanner…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#090909]">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-blue-500/20" />
        <span className="absolute inset-0 rounded-2xl border border-blue-400/40" />
        <TriangleLogoIcon className="relative h-8 w-8" />
      </div>

      <p className="text-sm font-medium text-zinc-500">{label}</p>

      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
