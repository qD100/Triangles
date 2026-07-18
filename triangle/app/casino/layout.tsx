import type { Metadata } from "next";

// Not linked from anywhere in the site's nav — this keeps it out of search
// results too, so the only way in is a direct URL.
export const metadata: Metadata = {
  title: "SuperSonic Casino",
  description: "Casino simulations — virtual credits only.",
  robots: { index: false, follow: false },
};

export default function CasinoLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0A0612]">{children}</div>;
}
