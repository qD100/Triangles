"use client";

import { motion } from "framer-motion";

export default function RadarLoader() {
  return (
    <div className="relative mb-5 h-24 w-24 overflow-hidden rounded-full border border-emerald-500/20 bg-[#0d1512]">

      <div className="absolute inset-[16%] rounded-full border border-emerald-500/20" />
      <div className="absolute inset-[32%] rounded-full border border-emerald-500/25" />
      <div className="absolute inset-[48%] rounded-full border border-emerald-500/30" />

      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(52,211,153,0) 0deg, rgba(52,211,153,0.45) 35deg, rgba(52,211,153,0) 85deg)",
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
      />

      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />

    </div>
  );
}
