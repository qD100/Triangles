import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { INFO_DOCS, type InfoDocSlug } from "@/app/data/infoDocs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const doc = INFO_DOCS[slug as InfoDocSlug];

  if (!doc) {
    return NextResponse.json({ error: "Unknown document" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "app", "infopdfs", doc.file);
  const bytes = await readFile(filePath);

  const download = new URL(request.url).searchParams.get("download") === "1";

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${doc.file}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
