import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TASI Scanner — supersonicscan",
  description: "ETF arbitrage and statistical pairs-trading scanners for the Saudi Exchange (TASI).",
};

export default function TasiLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
