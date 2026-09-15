export type AlphaDirection =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

export type AlphaBias = AlphaDirection;

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

export type StructureTrend =
  | "BULLISH"
  | "BEARISH"
  | "RANGE";

export type StructureBreakType =
  | "BOS"
  | "CHoCH";

export type StructureContext = {
  trend: StructureTrend;
  strength: number;
  latestSwing:
    | "HH"
    | "HL"
    | "LH"
    | "LL"
    | null;
  latestBreak: {
    type: StructureBreakType;
    direction: AlphaDirection;
    price: number;
    brokenPrice: number;
    timestamp: string;
  } | null;
  reasons: string[];
};

export type VolumeContext = {
  currentVolume: number;
  averageVolume: number;
  volumeRatio: number;
  condition: "HIGH" | "NORMAL" | "LOW";
};

export type AlphaContext = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  trend: TrendContext;

  momentum: MomentumContext;

  volume: VolumeContext;

  volatility: VolatilityContext;

  structure: StructureContext;
};