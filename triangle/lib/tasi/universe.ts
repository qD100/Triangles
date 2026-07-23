// Central registry of instruments tracked by both scanner modules. Expanding
// either list (more ETFs, more TASI tickers) is the only change needed to
// widen coverage — nothing downstream references symbols directly.

export interface EtfDefinition {
  symbol: string; // Yahoo ticker for the ETF itself
  name: string;
  benchmarkSymbol: string; // Yahoo ticker for the index it approximates
  benchmarkName: string;
  ivSymbol: string | null; // Yahoo's live Indicative Value ticker, if one exists
  currency: string;
}

// Both verified directly against Yahoo's chart endpoint this session. KSA has
// a real IV (indicative/intraday value) ticker; MSAU.L does not (IV tickers
// are a US/NYSE-Arca convention) and trades extremely thin volume (single
// digits to low hundreds of shares/day on some sessions) — flagged in the UI,
// not hidden.
export const ETF_UNIVERSE: EtfDefinition[] = [
  {
    symbol: "KSA",
    name: "iShares MSCI Saudi Arabia ETF",
    benchmarkSymbol: "^TASI.SR",
    benchmarkName: "TASI",
    ivSymbol: "^KSA-IV",
    currency: "USD",
  },
  {
    symbol: "MSAU.L",
    name: "Invesco MSCI Saudi Arabia ETF",
    benchmarkSymbol: "^TASI.SR",
    benchmarkName: "TASI",
    ivSymbol: null,
    currency: "USD",
  },
];

export interface StockDefinition {
  symbol: string; // Yahoo ticker, ".SR" suffix
  name: string;
  sector: string;
}

// ~30 liquid TASI large/mid-caps spanning multiple sectors (for meaningful
// pairs — same-sector pairs tend to cointegrate better than cross-sector
// ones, so sector is exposed for the Analytics rankings). All individually
// verified against Yahoo's chart endpoint this session.
export const STOCK_UNIVERSE: StockDefinition[] = [
  { symbol: "2222.SR", name: "Saudi Aramco", sector: "Energy" },
  { symbol: "1120.SR", name: "Al Rajhi Bank", sector: "Banks" },
  { symbol: "1180.SR", name: "Saudi National Bank", sector: "Banks" },
  { symbol: "1211.SR", name: "Maaden", sector: "Materials" },
  { symbol: "7010.SR", name: "stc", sector: "Telecom" },
  { symbol: "2010.SR", name: "SABIC", sector: "Materials" },
  { symbol: "2082.SR", name: "ACWA Power", sector: "Utilities" },
  { symbol: "1010.SR", name: "Riyad Bank", sector: "Banks" },
  { symbol: "4013.SR", name: "Dr. Sulaiman Al Habib Medical", sector: "Healthcare" },
  { symbol: "5110.SR", name: "Saudi Electricity Company", sector: "Utilities" },
  { symbol: "1150.SR", name: "Alinma Bank", sector: "Banks" },
  { symbol: "1060.SR", name: "Saudi Awwal Bank", sector: "Banks" },
  { symbol: "2020.SR", name: "SABIC Agri-Nutrients", sector: "Materials" },
  { symbol: "7203.SR", name: "Elm Company", sector: "Technology" },
  { symbol: "1050.SR", name: "Banque Saudi Fransi", sector: "Banks" },
  { symbol: "7020.SR", name: "Etihad Etisalat (Mobily)", sector: "Telecom" },
  { symbol: "2280.SR", name: "Almarai", sector: "Food & Retail" },
  { symbol: "1080.SR", name: "Arab National Bank", sector: "Banks" },
  { symbol: "4280.SR", name: "Kingdom Holding", sector: "Diversified" },
  { symbol: "1140.SR", name: "Bank Albilad", sector: "Banks" },
  { symbol: "4030.SR", name: "Bahri (National Shipping Co)", sector: "Industrials" },
  { symbol: "2350.SR", name: "Saudi Kayan Petrochemical", sector: "Materials" },
  { symbol: "4190.SR", name: "Jarir Marketing", sector: "Food & Retail" },
  { symbol: "3030.SR", name: "Saudi Cement Company", sector: "Materials" },
  { symbol: "2170.SR", name: "Alujain Corporation", sector: "Materials" },
  { symbol: "8210.SR", name: "Bupa Arabia", sector: "Insurance" },
  { symbol: "2050.SR", name: "Savola Group", sector: "Food & Retail" },
  { symbol: "4001.SR", name: "Abdullah Al-Othaim Markets", sector: "Food & Retail" },
  { symbol: "6002.SR", name: "Herfy Food Services", sector: "Food & Retail" },
  { symbol: "4003.SR", name: "United Electronics (eXtra)", sector: "Food & Retail" },
  { symbol: "3080.SR", name: "Eastern Province Cement", sector: "Materials" },
  { symbol: "4161.SR", name: "BinDawood Holding", sector: "Food & Retail" },
];
