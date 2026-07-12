"use client";

import { useState } from "react";

const SVG_LOGOS = [
  "BTC",
  "ETH",
  "USDT",
  "BNB",
  "SOL",
  "XRP",
  "DOGE",
  "ADA",
  "TRX",
  "WBTC",
  "ZEC",
  "LTC",
  "LINK",
  "MATIC",
  "DOT",
  "AVAX",
  "BCH",
  "ETC",
  "UNI",
  "ATOM",
  "FIL",
  "ICP",
  "AAVE",
  "XLM",
  "VET",
  "ALGO",
  "SAND",
  "MANA",
  "GRT",
  "STX",
  "COMP",
  "MKR",
  "SNX",
  "CRV",
  "CHZ",
  "ENJ",
  "ZRX",
  "BAT",
  "YFI",
  "SUSHI",
  "WAVES",
  "1INCH",
  "DASH",
  "ZIL",
  "QTUM",
  "OMG",
  "REN",
  "ANKR",
  "KSM",
  "DGB",
  "SC",
  "RVN",
  "XTZ",
  "THETA",
  "ONE",
  "HOT",
  "PAXG",
];

const PNG_LOGOS = ["HYPE", "WBETH"];

const AVAILABLE_LOGOS = new Map<string, "svg" | "png">([
  ...SVG_LOGOS.map((symbol): [string, "svg" | "png"] => [symbol, "svg"]),
  ...PNG_LOGOS.map((symbol): [string, "svg" | "png"] => [symbol, "png"]),
]);

type CoinStyle = {
  bg: string;
  fg: string;
  glyph: string;
};

const COIN_STYLES: Record<string, CoinStyle> = {
  BTC: { bg: "#F7931A", fg: "#1a1408", glyph: "₿" },
  ETH: { bg: "linear-gradient(135deg,#8A92B2,#627EEA)", fg: "#ffffff", glyph: "Ξ" },
  USDT: { bg: "#26A17B", fg: "#ffffff", glyph: "₮" },
  BNB: { bg: "#F0B90B", fg: "#1a1408", glyph: "B" },
  SOL: { bg: "linear-gradient(135deg,#9945FF,#14F195)", fg: "#ffffff", glyph: "◎" },
  XRP: { bg: "#23292F", fg: "#ffffff", glyph: "✕" },
  DOGE: { bg: "#C2A633", fg: "#1a1408", glyph: "Ð" },
  ADA: { bg: "#0033AD", fg: "#ffffff", glyph: "₳" },
  TRX: { bg: "#EF0027", fg: "#ffffff", glyph: "T" },
  HYPE: { bg: "linear-gradient(135deg,#0EA5E9,#22D3EE)", fg: "#062a33", glyph: "H" },
};

const DEFAULT_STYLE: CoinStyle = {
  bg: "#27272a",
  fg: "#a1a1aa",
  glyph: "",
};

type Props = {
  symbol: string;
  size?: number | string;
  className?: string;
};

export default function CoinIcon({ symbol, size = 36, className = "" }: Props) {
  const key = symbol.toUpperCase();
  const [imageFailed, setImageFailed] = useState(false);
  const extension = AVAILABLE_LOGOS.get(key);

  if (extension && !imageFailed) {
    return (
      <img
        src={`/coins/${key.toLowerCase()}.${extension}`}
        alt={key}
        className={`shrink-0 rounded-full ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImageFailed(true)}
      />
    );
  }

  const style = COIN_STYLES[key] ?? DEFAULT_STYLE;
  const glyph = style.glyph || key.slice(0, 2);
  const isGradient = style.bg.startsWith("linear-gradient");

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: isGradient ? undefined : style.bg,
        backgroundImage: isGradient ? style.bg : undefined,
        color: style.fg,
        fontSize:
          typeof size === "number"
            ? Math.max(10, size * (glyph.length > 1 ? 0.32 : 0.42))
            : 14,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "-0.03em",
      }}
    >
      {glyph}
    </div>
  );
}
