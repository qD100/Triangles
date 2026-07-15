import Link from "next/link";

type Props = {
  icon: string;
  title: string;
};

export default function ComingSoon({ icon, title }: Props) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#111111] text-5xl">
        {icon}
      </div>

      <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>

      <p className="text-sm uppercase tracking-wide text-zinc-500">Coming Soon</p>

      <Link
        href="/casino"
        className="mt-4 rounded-lg border border-zinc-800 bg-[#181818] px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
      >
        ← Back to Casino
      </Link>
    </main>
  );
}
