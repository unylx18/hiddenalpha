export type MarketRegime =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

export type MarketRegimeResult = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  regime: MarketRegime;

  confidence: number;

  reasons: string[];
};