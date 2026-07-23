"use client";

import { motion } from "framer-motion";
import { TriangleLogoIcon } from "../icons";
import { mulberry32 } from "./randomWalk";

// Deterministic scattered dot field standing in for a low-opacity world map
// texture — not a geographically accurate map, just a decorative backdrop
// behind the radar sweep.
function useMapDots() {
  const rand = mulberry32(77);
  const dots: { x: number; y: number; r: number }[] = [];

  for (let i = 0; i < 140; i++) {
    dots.push({ x: rand() * 100, y: rand() * 100, r: rand() > 0.85 ? 1.6 : 1 });
  }

  return dots;
}

const RINGS = [1, 0.74, 0.48];

const PING_DOTS = [
  { x: "62%", y: "30%", color: "#2F80FF", delay: 0 },
  { x: "24%", y: "62%", color: "#FF5B5B", delay: 0.6 },
  { x: "78%", y: "70%", color: "#18D26E", delay: 1.2 },
];

export default function RadarVisual() {
  const dots = useMapDots();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px] sm:max-w-[480px]">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundImage: "radial-gradient(closest-side, rgba(47,128,255,0.14), rgba(47,128,255,0.03) 70%, transparent 100%)",
        }}
      />

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-40">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#8FB4FF" />
        ))}
      </svg>

      {RINGS.map((scale, i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-[#2F80FF]/45"
          style={{ transform: `scale(${scale})`, boxShadow: "0 0 24px -10px rgba(47,128,255,0.6)" }}
        />
      ))}

      <div className="absolute inset-0 overflow-hidden rounded-full border border-[#2F80FF]/25">
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "conic-gradient(from 0deg, transparent 0deg, rgba(47,128,255,0.75) 16deg, rgba(47,128,255,0.15) 45deg, transparent 90deg, transparent 360deg)",
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
        />
      </div>

      {PING_DOTS.map((p, i) => (
        <div key={i} className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }}>
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: p.color, animationDelay: `${p.delay}s`, animationDuration: "2.4s" }}
          />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="absolute inset-0 rounded-2xl bg-[#2F80FF]"
          animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.25, 1] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          style={{ filter: "blur(18px)" }}
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2F80FF] to-[#1a4fc4] shadow-[0_0_40px_-6px_#2F80FF] sm:h-20 sm:w-20">
          <TriangleLogoIcon className="h-8 w-8 text-white sm:h-10 sm:w-10" />
        </div>
      </div>
    </div>
  );
}
