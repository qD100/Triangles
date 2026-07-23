import { NextResponse } from "next/server";
import { getEtfScannerData } from "@/lib/tasi/etf-scanner";

export async function GET() {
  try {
    const data = await getEtfScannerData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
