"use client";

import { Download, FileText, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildAllocationCsv, triggerCsvDownload } from "@/lib/portfolio-builder/csv-export";
import { buildPortfolioPdf } from "@/lib/portfolio-builder/pdf";
import type {
  Allocation,
  EtfSymbol,
  PortfolioMetrics,
  RiskScoreResult,
} from "@/lib/portfolio-builder/types";

interface ExportControlsProps {
  symbols: EtfSymbol[];
  allocation: Allocation;
  riskScore: RiskScoreResult;
  metrics: PortfolioMetrics;
  onRestart: () => void;
}

export function ExportControls({
  symbols,
  allocation,
  riskScore,
  metrics,
  onRestart,
}: ExportControlsProps) {
  const handleDownloadPdf = () => {
    const doc = buildPortfolioPdf({ symbols, allocation, riskScore, metrics });
    doc.save("portfolio-recommendation.pdf");
  };

  const handleDownloadCsv = () => {
    triggerCsvDownload("portfolio-allocation.csv", buildAllocationCsv(allocation, symbols));
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
      <Button variant="outline" onClick={handleDownloadPdf}>
        <FileText /> Export as PDF
      </Button>
      <Button variant="outline" onClick={handleDownloadCsv}>
        <Download /> Download Allocation CSV
      </Button>
      <Button variant="ghost" onClick={onRestart}>
        <RotateCcw /> Restart Questionnaire
      </Button>
    </div>
  );
}
