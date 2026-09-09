import { IndicatorResult } from "@/lib/trading/types/indicator";
import { MarketRegimeResult } from "@/lib/trading/regime/types";
import { VolumeAnalysis } from "@/lib/trading/volume/calculator";
import { AlphaContext } from "@/lib/trading/context/alpha-types";
import { AlphaScoreResult } from "@/lib/trading/context/alpha-score-calculator";

export type MarketBias =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

export type MarketContextScore = {
  bias: MarketBias;
  score: number;
  confidence: number;
  reasons: string[];
};

export type MarketContextBase = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  indicators: IndicatorResult;

  regime: MarketRegimeResult;

  volume: VolumeAnalysis;

  alpha: AlphaContext;
};

export type MarketContext =
  MarketContextBase & {
    score: MarketContextScore;
    alphaScore: AlphaScoreResult;
  };