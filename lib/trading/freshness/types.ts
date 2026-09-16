export type SignalFreshnessStatus =
  | "FRESH"
  | "NEAR_ENTRY"
  | "EXTENDED"
  | "STALE"
  | "INVALIDATED"
  | "TP1_HIT"
  | "TP2_HIT"
  | "NO_SETUP";

export type SignalFreshnessInput = {
  direction: "LONG" | "SHORT";

  timeframe: string;
  timestamp: string;

  entryPrice: number;
  stopLossPrice: number;

  takeProfit1Price: number;
  takeProfit2Price: number;

  currentPrice: number;
};

export type SignalFreshnessResult = {
  status: SignalFreshnessStatus;

  actionable: boolean;

  currentPrice: number;

  entryPrice: number | null;

  distanceFromEntryPercent:
    | number
    | null;

  progressR:
    | number
    | null;

  ageMinutes:
    | number
    | null;

  maxAgeMinutes:
    | number
    | null;

  reason: string;
};