"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerSnapshot(): "light" | "dark" {
  return "light";
}

/** Tracks OS-level color scheme so charts can pick light/dark series colors. */
export function useColorScheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
