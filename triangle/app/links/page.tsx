import type { Metadata } from "next";
import LinksPage from "./LinksPage";

export const metadata: Metadata = {
  title: "@1plusr — Links",
  description: "All social links in one place.",
};

export default function Page() {
  return <LinksPage />;
}
