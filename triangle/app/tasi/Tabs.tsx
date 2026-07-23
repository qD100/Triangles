"use client";

import { useState } from "react";

export interface TabDef {
  key: string;
  label: string;
  content: React.ReactNode;
}

// Only the active tab's node is ever rendered (the others are unmounted
// React elements sitting in the `tabs` array, never inserted into the tree),
// so inactive scanners' hooks/polling never run.
export default function Tabs({ tabs, defaultTab }: { tabs: TabDef[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-xs font-medium tracking-wide transition-colors ${
              active === tab.key
                ? "border-b-2 border-blue-500 text-white"
                : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
}
