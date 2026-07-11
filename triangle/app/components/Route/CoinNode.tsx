"use client";

import CoinIcon from "../Market/CoinIcon";

type Glow = "none" | "base" | "route";

type Props = {
  coin: string;
  active?: boolean;
  glow?: Glow;
};

export default function CoinNode({
  coin,
  active = false,
  glow = "none",
}: Props) {
  const glowClasses = {
    none: "",

    base:
      "border-blue-500 bg-blue-500/15 shadow-[0_0_35px_rgba(59,130,246,0.8)]",

    route:
      "border-yellow-400 bg-yellow-400/15 shadow-[0_0_35px_rgba(250,204,21,0.8)]",
  };

  return (
    <div className="flex flex-col items-center">

      {/* Coin Circle */}

      <div
        className={`
          relative
          flex
          h-[70px]
          w-[70px]
          items-center
          justify-center
          rounded-full
          border-2
          transition-all
          duration-300
          ${glowClasses[glow]}
          ${
            active
              ? "scale-110"
              : "scale-100 border-zinc-700 bg-[#181818]"
          }
        `}
      >
        {/* Pulse Ring */}

        {active && (
          <div className="absolute inset-0 animate-ping rounded-full border border-blue-400 opacity-30" />
        )}

        {/* Coin Icon */}

        <div className="relative z-10">
          <CoinIcon symbol={coin} size={50} />
        </div>
      </div>

      {/* Coin Name */}

      <div className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        {coin}
      </div>
    </div>
  );
}