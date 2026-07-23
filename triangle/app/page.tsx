import { Inter } from "next/font/google";
import Navbar from "./components/home/Navbar";
import Hero from "./components/home/Hero";
import ScannerGrid from "./components/home/ScannerGrid";
import LiveFeed from "./components/home/LiveFeed";
import MarketCards from "./components/home/MarketCards";
import TopOpportunity from "./components/home/TopOpportunity";
import HomeStatusBar from "./components/home/HomeStatusBar";
import SpotlightBackground from "./components/home/SpotlightBackground";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export default function Home() {
  return (
    <div className={`${inter.className} flex min-h-screen flex-col`}>
      <SpotlightBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="flex-1">
          <Hero />
          <ScannerGrid />

          <section className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-[1.3fr_1fr_0.9fr] lg:px-10">
            <LiveFeed />
            <MarketCards />
            <TopOpportunity />
          </section>
        </main>

        <HomeStatusBar />
      </div>
    </div>
  );
}
