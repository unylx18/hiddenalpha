export type SignalDirection =
  | "LONG"
  | "SHORT"
  | "WAIT";

export type SignalStatus =
  | "ACTIVE"
  | "INVALIDATED"
  | "EXPIRED"
  | "COMPLETED";

export type SignalConfidence =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type SignalQuality =
  | "VALID"
  | "WEAK"
  | "REJECTED";

export type SignalReason = {
  factor: string;
  direction:
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL";
  message: string;
};

export type TradingSignal = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  direction: SignalDirection;

  summary: string;

  confidence: number;
  confidenceLevel: SignalConfidence;

  quality: SignalQuality;

  status: SignalStatus;

  reasons: SignalReason[];

  invalidation: string | null;
};