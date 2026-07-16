import type { Metadata } from "next";

import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Portfolio Builder",
  description: "Risk-profiled portfolio recommendations backed by historical ETF data.",
};

export default function PortfolioBuilderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
