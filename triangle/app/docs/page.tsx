import Link from "next/link";
import { FileText } from "lucide-react";
import { BoltIcon } from "@/app/components/icons";
import { INFO_DOCS } from "@/app/data/infoDocs";

export default function DocsPage() {
  const docs = Object.entries(INFO_DOCS);

  return (
    <div className="min-h-screen bg-[#05070B]">
      <header className="sticky top-0 z-50 border-b border-white/6 bg-[#05070B]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2F80FF] to-[#1a4fc4] text-white">
              <BoltIcon className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              SUPERSONIC<span className="text-[#2F80FF]">SCAN</span>
            </span>
          </Link>
          <div className="ml-2 border-l border-white/6 pl-3 text-sm font-semibold text-white">Documentation</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-white">Documentation</h1>
        <p className="mt-2 max-w-lg text-sm text-zinc-500">
          Reference PDFs covering the concept, formulas, and mechanics behind
          every strategy on the platform.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {docs.map(([slug, doc]) => (
            <Link
              key={slug}
              href={`/info/${slug}`}
              className="group flex items-center gap-3 rounded-xl border border-white/6 bg-[#0B1220] p-4 transition-all hover:-translate-y-0.5 hover:border-[#2F80FF]/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2F80FF]/10 text-[#2F80FF]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{doc.title}</div>
                <div className="text-[11px] text-zinc-500">PDF reference</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
