"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef } from "react";

const BRAND_COLORS = ["#10b981", "#2563eb", "#7c3aed"];

/** Fires once when the recommendation reveals, never on subsequent re-renders. */
export function ConfettiBurst() {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.3 }, colors: BRAND_COLORS });
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { x: 0.2, y: 0.4 },
      colors: BRAND_COLORS,
    });
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { x: 0.8, y: 0.4 },
      colors: BRAND_COLORS,
    });
  }, []);

  return null;
}
