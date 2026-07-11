"use client";

import Header from "./components/Header";
import MarketTable from "./components/Market/MarketTable";
import RouteAnimation from "./components/Route/RouteAnimation";
import ScannerFeed from "./components/Scanner/ScannerFeed";
import StatusBar from "./components/StatusBar";
import useTerminal from "./components/hooks/useTerminal";

export default function Home() {
  const terminal = useTerminal();

  return (
    <>
      <Header
        connected={terminal.connected}
        opportunitiesPerMin={terminal.opportunitiesPerMin}
        bestProfit={terminal.statistics.bestProfit}
        lastUpdate={terminal.lastUpdate}
        settings={terminal.settings}
        onUpdateSettings={terminal.updateSettings}
      />

      <main className="mx-auto grid w-full max-w-[1800px] flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_1fr_1.15fr]">

        <MarketTable
          coins={terminal.coins}
          flashStates={terminal.flashStates}
          glowStates={terminal.glowStates}
          temporaryCoin={terminal.temporaryCoin}
        />

        <RouteAnimation
          data={terminal.currentRoute}
          scanStatus={terminal.scanStatus}
        />

        <ScannerFeed events={terminal.scannerEvents} />

      </main>

      <StatusBar
        connected={terminal.connected}
        latency={terminal.statistics.latency}
        scanStatus={terminal.scanStatus}
        settings={terminal.settings}
        uptime={terminal.uptime}
      />
    </>
  );
}
