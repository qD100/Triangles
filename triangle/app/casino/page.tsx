import Link from "next/link";
import GameCard, { type CasinoGame } from "./GameCard";

// Adding a new game is just appending one entry here — the homepage grid
// renders straight from this list, nothing else needs to change.
const GAMES: CasinoGame[] = [
  {
    id: "plinko",
    title: "Plinko",
    description: "Drop the ball, chase the multiplier.",
    icon: "🎯",
    href: "/casino/plinko",
    accent: "blue",
  },
  {
    id: "mines",
    title: "Mines",
    description: "Reveal tiles, avoid the bombs.",
    icon: "💣",
    href: "/casino/mines",
    accent: "rose",
  },
  {
    id: "roulette",
    title: "Roulette",
    description: "Place your bets, spin the wheel.",
    icon: "🎡",
    href: "/casino/roulette",
    accent: "amber",
  },
];

export default function CasinoPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col p-4 sm:p-6 lg:p-8">
      <Link
        href="/"
        className="mb-8 w-fit text-xs font-semibold text-zinc-500 transition-colors hover:text-white"
      >
        ← Triangle Terminal
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 pb-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            SuperSonic Casino
          </h1>

          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 sm:text-base">
            Casino Simulations • Virtual Credits Only
          </p>

          <p className="max-w-md text-xs leading-relaxed text-zinc-600 sm:text-sm">
            These games are simulations for entertainment purposes only. No real
            money, deposits, withdrawals, or prizes are involved.
          </p>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </main>
  );
}
