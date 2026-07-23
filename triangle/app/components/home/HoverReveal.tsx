"use client";

import type { RefObject } from "react";

// Imperative style mutation (not React state) so mousemove doesn't trigger a
// re-render — the element stays invisible until hovered, then a soft radial
// mask reveals it in a small circle centered on the cursor, matching
// SpotlightBackground's page-level effect but scoped to one element.
//
// Takes the ref rather than creating/returning one: the consuming component
// owns its own `useRef`, so this hook's return value is plain handler
// functions only (bundling a ref inside a hook's returned object trips the
// `react-hooks/refs` lint rule, which flags any property access on it).
export function useHoverReveal<T extends HTMLElement>(ref: RefObject<T | null>) {
  function reveal(event: React.MouseEvent<T>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--rx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--ry", `${event.clientY - rect.top}px`);
    el.style.setProperty("--reveal", "1");
  }

  function hide() {
    ref.current?.style.setProperty("--reveal", "0");
  }

  return {
    onMouseMove: reveal,
    onMouseEnter: reveal,
    onMouseLeave: hide,
  };
}

export const HOVER_REVEAL_CSS = `
.hover-reveal-text {
  --rx: 50%;
  --ry: 50%;
  --reveal: 0;
  opacity: var(--reveal);
  transition: opacity 0.25s ease;
  -webkit-mask-image: radial-gradient(70px circle at var(--rx) var(--ry), black 0%, black 35%, transparent 80%);
  mask-image: radial-gradient(70px circle at var(--rx) var(--ry), black 0%, black 35%, transparent 80%);
}
`;
