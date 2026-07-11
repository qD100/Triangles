"use client";

import { motion } from "framer-motion";

export default function ScanningLoader() {
  return (
    <div className="relative mb-5 h-24 w-24">

      <motion.div
        className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-400/20"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
      />

      <motion.div
        className="absolute inset-3 rounded-full border border-dashed border-yellow-400/30"
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
      />

      <motion.svg
        viewBox="0 0 24 24"
        className="absolute inset-0 h-full w-full p-6 text-yellow-400"
        style={{ filter: "drop-shadow(0 0 8px rgba(250,204,21,0.55))" }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
      >
        <path
          d="M12 3 22 20H2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </motion.svg>

      <motion.div
        className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400"
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.3, 0.8] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
      />

    </div>
  );
}
