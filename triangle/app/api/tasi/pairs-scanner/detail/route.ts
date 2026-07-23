import { NextRequest, NextResponse } from "next/server";
import { getPairDetailData } from "@/lib/tasi/pairs-scanner";

export async function GET(request: NextRequest) {
  const a = request.nextUrl.searchParams.get("a");
  const b = request.nextUrl.searchParams.get("b");

  if (!a || !b) {
    return NextResponse.json({ error: "Query params 'a' and 'b' are required." }, { status: 400 });
  }

  try {
    const data = await getPairDetailData(a, b);
    if (!data) {
      return NextResponse.json({ error: "Pair not found or insufficient overlapping data." }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
