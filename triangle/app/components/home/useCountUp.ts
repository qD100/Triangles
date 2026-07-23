"use client";

import { useEffect, useRef, useState } from "react";

// Eases a number from 0 to `target` once on mount, then holds — used for the
// hero stat tiles' "counting up" entrance.
export function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    }

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return value;
}

// Small live-feeling jitter around a base value, re-rolled on an interval —
// used for stats that should look like they're continuously updating.
export function useJitter(base: number, amplitude: number, intervalMs = 4500) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setOffset((Math.random() - 0.5) * 2 * amplitude);
    }, intervalMs);

    return () => clearInterval(id);
  }, [amplitude, intervalMs]);

  return Math.round(base + offset);
}
