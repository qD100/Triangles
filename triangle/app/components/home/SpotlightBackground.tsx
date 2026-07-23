"use client";

import { useEffect, useRef } from "react";

// Same ambient grid/scanline/symbol animation as /links, but kept invisible
// by default and only revealed inside a small circle that follows the
// cursor (via a CSS mask, updated imperatively — not React state — so
// mousemove doesn't trigger a re-render on every pixel).
const MATH_SYMBOLS = ["∆", "Σ", "√", "π", "∞", "∫"];

export default function SpotlightBackground() {
  const maskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = maskRef.current;
    if (!el) return;

    function handleMove(event: MouseEvent) {
      el!.style.setProperty("--mx", `${event.clientX}px`);
      el!.style.setProperty("--my", `${event.clientY}px`);
      el!.style.setProperty("--spot-opacity", "1");
    }

    function handleLeave() {
      el!.style.setProperty("--spot-opacity", "0");
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#05070B]">
      <style>{SPOTLIGHT_CSS}</style>
      <div ref={maskRef} className="ss-spotlight-mask absolute inset-0">
        <div className="ss-grid" />
        <div className="ss-scanline" />
        {MATH_SYMBOLS.map((sym, i) => (
          <span
            key={sym}
            className="ss-symbol"
            style={{
              left: `${8 + i * 16}%`,
              animationDelay: `${i * 1.7}s`,
              animationDuration: `${14 + i * 2}s`,
            }}
          >
            {sym}
          </span>
        ))}
      </div>
    </div>
  );
}

const SPOTLIGHT_CSS = `
.ss-spotlight-mask {
  --mx: 50%;
  --my: 50%;
  --spot-opacity: 0;
  opacity: var(--spot-opacity);
  transition: opacity 0.3s ease;
  -webkit-mask-image: radial-gradient(160px circle at var(--mx) var(--my), black 0%, black 30%, transparent 75%);
  mask-image: radial-gradient(160px circle at var(--mx) var(--my), black 0%, black 30%, transparent 75%);
}

.ss-grid {
  position: absolute;
  inset: -10%;
  background-image:
    linear-gradient(to right, rgba(47, 128, 255, 0.22) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(47, 128, 255, 0.22) 1px, transparent 1px);
  background-size: 42px 42px;
  animation: ss-grid-drift 30s linear infinite;
}
@keyframes ss-grid-drift {
  from { transform: translate(0, 0); }
  to { transform: translate(42px, 42px); }
}

.ss-scanline {
  position: absolute;
  left: 0;
  right: 0;
  height: 180px;
  background: linear-gradient(to bottom, transparent, rgba(47, 128, 255, 0.3), transparent);
  animation: ss-scan-sweep 9s ease-in-out infinite;
}
@keyframes ss-scan-sweep {
  0% { top: -20%; }
  50% { top: 100%; }
  100% { top: -20%; }
}

.ss-symbol {
  position: absolute;
  top: 100%;
  font-size: 38px;
  font-family: Georgia, serif;
  color: rgba(47, 128, 255, 0.45);
  animation-name: ss-symbol-float;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes ss-symbol-float {
  0% { top: 105%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: -10%; opacity: 0; }
}
`;
