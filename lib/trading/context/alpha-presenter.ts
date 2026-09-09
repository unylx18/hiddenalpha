import { MarketContext } from "@/lib/trading/context/types";

export type AlphaContextResponse = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  market: {
    bias: MarketContext["score"]["bias"];
    score: number;
    confidence: number;
  };

  trend: {
    direction: MarketContext["alpha"]["trend"]["direction"];
    strength: number;
  };

  momentum: {
    direction: MarketContext["alpha"]["momentum"]["direction"];
    strength: number;
  };

  volume: {
    condition: MarketContext["volume"]["condition"];
    ratio: number;
  };

  volatility: {
    level: MarketContext["alpha"]["volatility"]["level"];
    value: number | null;
    percentage: number | null;
  };
};

export function presentAlphaContext(
  context: MarketContext
): AlphaContextResponse {
  return {
    symbol: context.symbol,
    timeframe: context.timeframe,
    timestamp: context.timestamp,

    market: {
      bias: context.alphaScore.bias,
      score: context.alphaScore.score,
      confidence: context.alphaScore.confidence,
    },

    trend: {
      direction: context.alpha.trend.direction,
      strength: context.alpha.trend.strength,
    },

    momentum: {
      direction: context.alpha.momentum.direction,
      strength: context.alpha.momentum.strength,
    },

    volume: {
      condition: context.volume.condition,
      ratio: context.volume.volumeRatio,
    },

    volatility: {
      level: context.alpha.volatility.level,
      value: context.alpha.volatility.value,
      percentage: context.alpha.volatility.percentage,
    },
  };
}