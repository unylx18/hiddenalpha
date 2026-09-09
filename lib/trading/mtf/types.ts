export type TimeframeRole =
  | "MACRO"
  | "SETUP"
  | "CONFIRMATION"
  | "ENTRY";

export type TimeframeAnalysis = {
  timeframe: string;
  role: TimeframeRole;

  bias:
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

  score: number;
  confidence: number;
};

export type MultiTimeframeResult = {
  symbol: string;

  overallBias:
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";

  alignment: number;

  confidence: number;

  analyses: TimeframeAnalysis[];

  reasons: string[];
};