import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

import { DATA_END_DATE, DATA_START_DATE, ETF_META } from "./constants";
import type { Allocation, EtfSymbol, PortfolioMetrics, RiskScoreResult } from "./types";

interface BuildPortfolioPdfArgs {
  symbols: EtfSymbol[];
  allocation: Allocation;
  riskScore: RiskScoreResult;
  metrics: PortfolioMetrics;
}

function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** jspdf-autotable attaches this at runtime; the bundled type defs don't declare it. */
function getFinalY(doc: jsPDF, fallback: number): number {
  const withTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return withTable.lastAutoTable?.finalY ?? fallback;
}

export function buildPortfolioPdf({
  symbols,
  allocation,
  riskScore,
  metrics,
}: BuildPortfolioPdfArgs): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20);
  doc.text("Portfolio Builder — Recommendation Report", marginX, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, marginX, 68);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text(`${riskScore.label} · Risk Score ${riskScore.score}/100`, marginX, 96);

  autoTable(doc, {
    startY: 116,
    margin: { left: marginX, right: marginX },
    head: [["Metric", "Value"]],
    body: [
      ["Expected Annual Volatility", formatPercent(metrics.expectedVolatility)],
      [`Historical CAGR (${DATA_START_DATE} to ${DATA_END_DATE})`, formatPercent(metrics.historicalCagr)],
      ["Worst Historical Drawdown", formatPercent(metrics.worstDrawdown)],
      ["Diversification Score", `${metrics.diversificationScore.toFixed(0)} / 100`],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
  });

  const afterMetricsY = getFinalY(doc, 200) + 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text("Recommended Allocation", marginX, afterMetricsY);

  autoTable(doc, {
    startY: afterMetricsY + 12,
    margin: { left: marginX, right: marginX },
    head: [["Symbol", "Asset", "Allocation"]],
    body: symbols.map((symbol) => [
      symbol,
      ETF_META[symbol].fullName,
      `${allocation[symbol].toFixed(1)}%`,
    ]),
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129] },
  });

  const afterAllocationY = getFinalY(doc, afterMetricsY + 160) + 30;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120);
  const disclaimer = doc.splitTextToSize(
    `Returns use each fund's dividend-and-split-adjusted close (${DATA_START_DATE} to ${DATA_END_DATE}), ` +
      "so reinvested dividends and distributions are included. This report is generated for educational " +
      "purposes and does not constitute financial advice.",
    515
  );
  doc.text(disclaimer, marginX, afterAllocationY);

  return doc;
}
