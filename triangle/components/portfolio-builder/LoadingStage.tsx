"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const DEFAULT_MESSAGES = [
  "Reading market history...",
  "Calculating volatility & drawdowns...",
  "Mapping asset correlations...",
  "Calibrating your risk profile...",
  "Building your personalized portfolio...",
];

interface LoadingStageProps {
  messages?: string[];
}

export function LoadingStage({ messages = DEFAULT_MESSAGES }: LoadingStageProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, messages.length - 1));
    }, 270);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 text-center">
      <motion.div
        className="h-16 w-16 rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-lg font-medium text-muted-foreground"
      >
        {messages[messageIndex]}
      </motion.p>
    </div>
  );
}
