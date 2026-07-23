"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { TooltipContent as TooltipContentData, Tone } from "./tooltip-content";

export { TooltipProvider };

const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-400",
  ok: "text-blue-400",
  warn: "text-yellow-400",
  bad: "text-red-400",
  neutral: "text-zinc-400",
};

const TONE_DOT: Record<Tone, string> = {
  good: "bg-emerald-400",
  ok: "bg-blue-400",
  warn: "bg-yellow-400",
  bad: "bg-red-400",
  neutral: "bg-zinc-500",
};

function RichTooltipBody({ content }: { content: TooltipContentData }) {
  return (
    <div className="space-y-2.5">
      <div className="text-sm font-bold text-white">{content.title}</div>

      {content.paragraphs?.map((p, i) => (
        <p key={i} className="text-xs leading-relaxed text-zinc-400">
          {p}
        </p>
      ))}

      {content.groups?.map((group, gi) => (
        <div key={gi} className="space-y-1">
          {group.heading && (
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {group.heading}
            </div>
          )}
          <ul className="space-y-1">
            {group.items.map((item, ii) => (
              <li key={ii} className="flex items-baseline gap-2 text-xs">
                <span className={`flex shrink-0 items-center gap-1.5 font-mono font-medium ${item.tone ? TONE_TEXT[item.tone] : "text-zinc-300"}`}>
                  {item.tone && <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[item.tone]}`} />}
                  {item.label}
                </span>
                <span className="text-zinc-400">{item.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {content.bullets && (
        <ul className="space-y-1">
          {content.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {content.actions && (
        <ul className="space-y-1 border-t border-zinc-800 pt-2">
          {content.actions.map((a, i) => (
            <li key={i} className={`flex items-center gap-1.5 text-xs font-medium ${TONE_TEXT[a.tone]}`}>
              <span>✔</span>
              <span>{a.text}</span>
            </li>
          ))}
        </ul>
      )}

      {content.example && (
        <div className="rounded-md border border-zinc-800 bg-[#181818] px-2.5 py-2 text-xs">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Example</div>
          <div className="mt-1 font-mono font-medium text-white">Pair: {content.example.pair}</div>
          <div className="mt-1 space-y-0.5 font-mono text-zinc-300">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Action</div>
            {content.example.actions.map((a, i) => (
              <div key={i}>{a}</div>
            ))}
          </div>
        </div>
      )}

      {content.note && (
        <p className="border-t border-zinc-800 pt-2 text-xs text-zinc-500 italic">{content.note}</p>
      )}

      {content.exitNote && (
        <p className="text-xs text-zinc-500">
          <span className="font-semibold text-zinc-400">Exit: </span>
          {content.exitNote}
        </p>
      )}
    </div>
  );
}

export function InfoTooltip({
  content,
  children,
  side = "top",
}: {
  content: TooltipContentData;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        render={<span className="inline-flex outline-none" />}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8} className="z-50">
          <TooltipPrimitive.Popup
            className="w-[340px] max-w-[340px] origin-(--transform-origin) rounded-lg border border-zinc-800 bg-[#111111] px-3.5 py-3 text-left shadow-2xl shadow-black/60 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:slide-in-from-bottom-1 data-[state=delayed-open]:duration-150 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-1 data-closed:duration-100"
          >
            <RichTooltipBody content={content} />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
