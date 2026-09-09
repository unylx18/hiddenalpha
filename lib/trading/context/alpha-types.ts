export type AlphaDirection =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

export type TrendContext = {
  direction: AlphaDirection;
  strength: number;
  reasons: string[];
};

export type MomentumContext = {
  direction: AlphaDirection;
  strength: number;
  reasons: string[];
};

export type VolatilityLevel =
  | "LOW"
  | "NORMAL"
  | "HIGH";

export type VolatilityContext = {
  level: VolatilityLevel;
  value: number | null;
  percentage: number | null;
  reasons: string[];
};

export type AlphaContext = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  trend: TrendContext;
  momentum: MomentumContext;
  volatility: VolatilityContext;
};