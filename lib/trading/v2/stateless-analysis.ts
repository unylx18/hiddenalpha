import { calculateEMA, calculateRSI, calculateATR } from "@/lib/trading/calculations/indicators";
import { calculateVolumeAnalysis } from "@/lib/trading/volume/calculator";
import { detectMarketStructure } from "@/lib/market-structure/detect-swings";
import { calculateAlphaContext } from "@/lib/trading/context/alpha-calculator";
import { calculateAlphaScore } from "@/lib/trading/context/alpha-score-calculator";
import { calculateMarketRegime } from "@/lib/trading/regime/calculator";
import type { IndicatorResult } from "@/lib/trading/types/indicator";
import { calculateKeyLevels, type KeyLevels } from "@/lib/trading/v2/key-levels";


export type AnalysisCandle = {
  timestamp: string;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type AnalysisProvider = "bybit" | "oanda";
export type VolumeKind = "traded_contracts" | "price_updates";
export type AnalysisPayload = {
  provider: AnalysisProvider;
  architecture: "stateless-on-demand";
  marketType: "crypto" | "forex";
  volumeKind: VolumeKind;
  fetchedAt: string;
  lastClosedAt: string;
  candleCount: number;
  alpha: {
    symbol: string;
    timeframe: string;
    timestamp: string;
    market: { bias: "BULLISH" | "BEARISH" | "NEUTRAL"; score: number; confidence: number };
    trend: { direction: string; strength: number };
    momentum: { direction: string; strength: number };
    volume: { condition: string; ratio: number };
    volatility: { level: string; value: number | null; percentage: number | null };
    marketRegime: string;
    keyLevels: KeyLevels;
    reasons: string[];
  };
};

export class AnalysisInputError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AnalysisInputError";
  }
}

/** Pure analysis: no database, HTTP fetch, background sync or orders. */
export function calculateV2Context({
  symbol, timeframe, duration, candles, provider, marketType, volumeKind,
  requireContinuousHistory,
}: {
  symbol: string;
  timeframe: string;
  duration: number;
  candles: AnalysisCandle[];
  provider: AnalysisProvider;
  marketType: "crypto" | "forex";
  volumeKind: VolumeKind;
  requireContinuousHistory: boolean;
}): AnalysisPayload {
  const now = Date.now();
  const closed = candles
    .filter(c => Number.isFinite(c.openTime) && c.openTime > 0 &&
      [c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite) &&
      c.low > 0 && c.volume >= 0 &&
      c.high >= Math.max(c.open, c.close, c.low) &&
      c.low <= Math.min(c.open, c.close, c.high) &&
      // The upstream forex adapter already checks OANDA's complete flag.
      // For the Crypto feed, do not consume an unfinished time bucket.
      c.openTime + duration <= now)
    .sort((a,b) => a.openTime - b.openTime)
    .filter((c,i,arr) => i === 0 || c.openTime !== arr[i - 1].openTime);

  if (closed.length < 200) {
    throw new AnalysisInputError(503, "Not enough completed market candles for EMA 200");
  }

  const latest = closed[closed.length - 1];
  const lastClosedAt = latest.openTime + duration;
  if (now - lastClosedAt > Math.max(duration * 2, 120_000)) {
    throw new AnalysisInputError(503, "Latest completed candle is stale or the market is closed");
  }

  if (requireContinuousHistory) {
    const last200 = closed.slice(-200);
    for (let i = 1; i < last200.length; i++) {
      if (last200[i].openTime - last200[i-1].openTime !== duration) {
        throw new AnalysisInputError(503, "Recent market candles contain gaps; no analysis generated");
      }
    }
  }
  // FX sessions have weekend/holiday gaps. Never fabricate missing candles
  // or incorrectly require 200 continuous 1-minute bars across weekends.

  const closes = closed.map(c => c.close);
  const highs = closed.map(c => c.high);
  const lows = closed.map(c => c.low);
  const volumes = closed.map(c => c.volume);

  const indicators: IndicatorResult = {
    symbol, timeframe,
    timestamp: latest.timestamp,
    price: latest.close,
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
    rsi14: calculateRSI(closes, 14),
    atr14: calculateATR(highs, lows, closes, 14),
  };
  // In FX this is relative OANDA price-update count, NOT traded volume.
  const volume = calculateVolumeAnalysis(volumes, 20);
  const structure = detectMarketStructure(closed, {leftBars: 2, rightBars: 2});
  const context = calculateAlphaContext(indicators, volume, structure);
  const score = calculateAlphaScore(context);
  const regime = calculateMarketRegime(indicators);
  const keyLevels = calculateKeyLevels(closed);

  return {
    provider,
    architecture: "stateless-on-demand",
    marketType,
    volumeKind,
    fetchedAt: new Date(now).toISOString(),
    lastClosedAt: new Date(lastClosedAt).toISOString(),
    candleCount: closed.length,
    alpha: {
      symbol, timeframe, timestamp: latest.timestamp,
      market: { bias: score.bias, score: score.score, confidence: score.confidence },
      trend: { direction: context.trend.direction, strength: context.trend.strength },
      momentum: { direction: context.momentum.direction, strength: context.momentum.strength },
      volume: {condition: volume.condition, ratio: volume.volumeRatio},
      volatility: {
        level: context.volatility.level,
        value: context.volatility.value,
        percentage: context.volatility.percentage,
      },
      marketRegime: regime.regime,
      keyLevels,
      reasons: score.reasons.slice(0, 8),
    },
  };
}
