import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Namaa — Portfolio Builder",
  description: "Risk-profiled portfolio recommendations backed by historical ETF data.",
};

export default function NamaaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
