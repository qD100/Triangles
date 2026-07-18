import { notFound } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { TriangleLogoIcon } from "@/app/components/icons";
import { INFO_DOCS, type InfoDocSlug } from "@/app/data/infoDocs";

export default async function InfoDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = INFO_DOCS[slug as InfoDocSlug];

  if (!doc) notFound();

  const pdfUrl = `/api/infopdfs/${slug}`;

  return (
    <div className="flex h-screen flex-col bg-[#0B0F17]">
      <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-[#111111]/90 px-3 backdrop-blur sm:h-16 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
            <TriangleLogoIcon className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline">Back to Terminal</span>
        </Link>

        <h1 className="absolute left-1/2 -translate-x-1/2 truncate px-2 text-sm font-semibold text-white sm:text-base">
          {doc.title}
        </h1>

        <a
          href={`${pdfUrl}?download=1`}
          download
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#181818] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white sm:text-sm"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save PDF</span>
        </a>
      </header>

      <iframe src={pdfUrl} title={doc.title} className="w-full flex-1" />
    </div>
  );
}
