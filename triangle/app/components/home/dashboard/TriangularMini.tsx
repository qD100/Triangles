"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber, FlashNumber, useFlashSignal } from "./AnimatedValue";
import type { TriangularSnapshot } from "./types";

const NODES = {
  anchor: { x: 80, y: 92 },
  legA: { x: 24, y: 16 },
  legB: { x: 136, y: 16 },
};

function ArrowPath({ d, active }: { d: string; active: boolean }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={active ? "#18D26E" : "#2F80FF"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeDasharray="5 5"
      markerEnd="url(#tri-arrowhead)"
      animate={{ strokeDashoffset: [0, -20] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
    />
  );
}

function TriangularMini({ data }: { data: TriangularSnapshot }) {
  const pulse = useFlashSignal(data.edgeDirection);
  const [anchor, legA, legB] = data.route;

  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
      <div className="relative mx-auto h-[110px] w-[160px]">
        <svg viewBox="0 0 160 110" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <marker id="tri-arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#2F80FF" />
            </marker>
          </defs>
          <ArrowPath d={`M${NODES.anchor.x - 8},${NODES.anchor.y - 6} L${NODES.legA.x + 6},${NODES.legA.y + 14}`} active={pulse > 0} />
          <ArrowPath d={`M${NODES.legA.x + 16},${NODES.legA.y + 2} L${NODES.legB.x - 16},${NODES.legB.y + 2}`} active={pulse > 0} />
          <ArrowPath d={`M${NODES.legB.x - 6},${NODES.legB.y + 14} L${NODES.anchor.x + 8},${NODES.anchor.y - 6}`} active={pulse > 0} />
        </svg>

        <RouteNode label={legA} x={NODES.legA.x} y={NODES.legA.y} />
        <RouteNode label={legB} x={NODES.legB.x} y={NODES.legB.y} />
        <RouteNode label={anchor} x={NODES.anchor.x} y={NODES.anchor.y} isAnchor />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <Stat label="Best Edge">
          <FlashNumber value={data.bestEdgePct} direction={data.edgeDirection} decimals={2} prefix="+" restColor="#e4e4e7" />
        </Stat>
        <Stat label="Active Opportunities">
          <AnimatedNumber value={data.activeOpportunities} className="font-mono text-white" />
        </Stat>
        <Stat label="Cycles Scanned">
          <AnimatedNumber value={data.cyclesScanned} className="font-mono text-white" duration={900} />
        </Stat>
        <Stat label="Updated">
          <span className="font-mono text-zinc-400">1 sec ago</span>
        </Stat>
      </div>
    </div>
  );
}

function RouteNode({ label, x, y, isAnchor }: { label: string; x: number; y: number; isAnchor?: boolean }) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      style={{ left: x, top: y }}
    >
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute h-8 w-8 rounded-full ${isAnchor ? "bg-[#18D26E]/25" : "bg-[#2F80FF]/25"} blur-[6px]`}
      />
      <div
        className={`relative flex h-7 w-7 items-center justify-center rounded-full border text-[9px] font-bold ${
          isAnchor ? "border-[#18D26E]/40 bg-[#18D26E]/15 text-[#18D26E]" : "border-[#2F80FF]/40 bg-[#2F80FF]/15 text-[#2F80FF]"
        }`}
      >
        {label}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</div>
      <div className="text-[13px] font-semibold">{children}</div>
    </div>
  );
}

export default memo(TriangularMini);
