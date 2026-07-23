"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Direction } from "./types";

// Tweens smoothly from whatever is currently displayed to the new target
// every time `target` changes — an odometer-style "counting" effect rather
// than snapping, satisfying the "no sudden jumps" requirement.
export function useAnimatedValue(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    const startValue = displayRef.current;
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startValue + (target - startValue) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

// Increments only when `direction` transitions to a non-flat value that
// differs from last time — used as a remount `key` so a flash animation
// re-triggers exactly once per real change, not on every render.
export function useFlashSignal(direction: Direction) {
  const [pulse, setPulse] = useState(0);
  const prevRef = useRef(direction);

  useEffect(() => {
    if (direction !== "flat" && direction !== prevRef.current) {
      setPulse((p) => p + 1);
    }
    prevRef.current = direction;
  }, [direction]);

  return pulse;
}

// Same remount-key trick as useFlashSignal, but for any value where a
// literal change (not an up/down direction) should trigger a one-shot pulse
// — e.g. the options card's "best strategy" row.
export function useChangeSignal<T>(value: T) {
  const [pulse, setPulse] = useState(0);
  const prevRef = useRef(value);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
    } else if (value !== prevRef.current) {
      setPulse((p) => p + 1);
    }
    prevRef.current = value;
  }, [value]);

  return pulse;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 600,
  className = "tabular-nums",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const display = useAnimatedValue(value, duration);
  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

// Combines the tween above with a brief color flash (green on "up", the
// given down-color on "down") that decays back to `restColor` — used for
// edge %, basis %, and premium % which should visibly react when they move.
export function FlashNumber({
  value,
  direction,
  decimals = 2,
  suffix = "%",
  prefix = "",
  restColor = "#e4e4e7",
  upColor = "#18D26E",
  downColor = "#FF5B5B",
  className = "font-mono tabular-nums",
}: {
  value: number;
  direction: Direction;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  restColor?: string;
  upColor?: string;
  downColor?: string;
  className?: string;
}) {
  const display = useAnimatedValue(value, 600);
  const pulse = useFlashSignal(direction);
  const flashColor = direction === "up" ? upColor : direction === "down" ? downColor : restColor;

  return (
    <motion.span
      key={pulse}
      initial={{ color: flashColor }}
      animate={{ color: restColor }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className={className}
    >
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </motion.span>
  );
}
