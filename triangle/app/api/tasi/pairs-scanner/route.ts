import { NextResponse } from "next/server";
import { getPairsScannerData } from "@/lib/tasi/pairs-scanner";

export async function GET() {
  try {
    const data = await getPairsScannerData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
