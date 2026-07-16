"use client";

import { ArrowRight, LineChart as LineChartIcon, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Know your risk profile",
    description:
      "A fast, adaptive questionnaire turns your answers into a 0-100 risk score and an investment style.",
  },
  {
    icon: LineChartIcon,
    title: "Real market analytics",
    description:
      "Six years of daily returns, volatility, drawdowns and correlations across five asset classes.",
  },
  {
    icon: Sparkles,
    title: "A portfolio built for you",
    description:
      "Your allocation shifts continuously with your risk score and each asset's historical volatility.",
  },
];

// Illustrative only — a smoothed random walk, not real fund data.
const PREVIEW_SERIES = [
  10000, 10120, 9980, 10240, 10310, 10180, 10420, 10650, 10590, 10820, 11040, 10930, 11210, 11480,
  11390, 11670, 11920, 11810, 12140, 12380, 12290, 12610, 12940, 12870, 13210, 13560, 13470, 13820,
  14180, 14620,
].map((value, index) => ({ index, value }));

export default function NamaaHome() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute top-0 right-0 h-[30rem] w-[30rem] rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-500/10" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-sm font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400"
        >
          Portfolio Builder
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl"
        >
          Build a portfolio backed by{" "}
          <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 bg-clip-text text-transparent">
            six years of market data
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          Answer a short risk questionnaire, see how SPY, VXUS, SGOV, GLD and VNQ have actually
          performed since 2020, and get a personalized allocation that responds to both.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-10"
        >
          <Link
            href="/namaa/portfolio-builder"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Open Portfolio Builder
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-16 h-40 w-full max-w-2xl rounded-3xl border border-black/5 bg-white/70 p-4 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/30"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PREVIEW_SERIES} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="previewFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2a78d6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2a78d6"
                strokeWidth={2.5}
                fill="url(#previewFill)"
                isAnimationActive
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 grid w-full grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-black/5 bg-white/70 p-6 text-left shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]"
            >
              <feature.icon className="size-5 text-blue-600 dark:text-blue-400" />
              <h3 className="mt-3 font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
