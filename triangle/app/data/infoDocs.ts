// One entry per scanner "topic" — each links a URL slug (used by both the
// viewer route and the PDF-serving API route) to the PDF sitting in
// app/infopdfs/. Adding a new topic is one entry here plus an <InfoButton
// slug="..."> wherever it belongs.
export type InfoDocSlug =
  | "triangular-arbitrage"
  | "spot-futures"
  | "put-call-parity"
  | "box-spread"
  | "option-chain-analysis"
  | "tasi-scanner";

export const INFO_DOCS: Record<InfoDocSlug, { file: string; title: string }> = {
  "triangular-arbitrage": { file: "1_triangular_arbitrage.pdf", title: "Triangular Arbitrage" },
  "spot-futures": { file: "2_spot_future_arbitrage.pdf", title: "Spot / Futures Arbitrage" },
  "put-call-parity": { file: "3_put_call_parity.pdf", title: "Put-Call Parity" },
  "box-spread": { file: "4_box_spread.pdf", title: "Box Spread" },
  "option-chain-analysis": { file: "6_option_chain_analysis.pdf", title: "Option Chain Analysis" },
  "tasi-scanner": { file: "7_tasi_etf_pairs.pdf", title: "TASI Scanner" },
};
