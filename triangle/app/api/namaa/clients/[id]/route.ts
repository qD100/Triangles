import { NextResponse } from "next/server";

import { buildClientAnnualSummary } from "@/lib/portfolio-builder/client-analytics";
import { findClientProfile, loadClientTransactions } from "@/lib/portfolio-builder/client-data";
import { computeClientRiskScore } from "@/lib/portfolio-builder/client-risk-score";
import type { ClientRecord } from "@/lib/portfolio-builder/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = await findClientProfile(id);

  if (!profile) {
    return NextResponse.json(
      { error: `No client found with ID "${id.trim().toUpperCase()}".` },
      { status: 404 }
    );
  }

  const transactions = await loadClientTransactions();
  const annualSummary = buildClientAnnualSummary(profile, transactions);
  const riskScore = computeClientRiskScore(profile, annualSummary);

  const record: ClientRecord = { profile, annualSummary, riskScore };
  return NextResponse.json(record);
}
