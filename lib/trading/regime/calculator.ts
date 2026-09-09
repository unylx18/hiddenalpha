import { IndicatorResult } from "@/lib/trading/types/indicator";
import {
  MarketRegime,
  MarketRegimeResult,
} from "@/lib/trading/regime/types";

export function calculateMarketRegime(
  indicators: IndicatorResult
): MarketRegimeResult {
  const reasons: string[] = [];

  let bullishScore = 0;
  let bearishScore = 0;

  const {
    price,
    ema20,
    ema50,
    rsi14,
  } = indicators;

  // Price vs EMA20
  if (ema20 !== null) {
    if (price > ema20) {
      bullishScore++;
      reasons.push("Price is above EMA20");
    } else {
      bearishScore++;
      reasons.push("Price is below EMA20");
    }
  }

  // EMA20 vs EMA50
  if (ema20 !== null && ema50 !== null) {
    if (ema20 > ema50) {
      bullishScore++;
      reasons.push("EMA20 is above EMA50");
    } else {
      bearishScore++;
      reasons.push("EMA20 is below EMA50");
    }
  }

  // RSI momentum
  if (rsi14 !== null) {
    if (rsi14 >= 55) {
      bullishScore++;
      reasons.push("RSI shows positive momentum");
    } else if (rsi14 <= 45) {
      bearishScore++;
      reasons.push("RSI shows negative momentum");
    } else {
      reasons.push("RSI is in a neutral momentum zone");
    }
  }

  let regime: MarketRegime = "NEUTRAL";

  if (bullishScore > bearishScore) {
    regime = "BULLISH";
  } else if (bearishScore > bullishScore) {
    regime = "BEARISH";
  }

  const totalSignals =
    bullishScore + bearishScore;

  const confidence =
    totalSignals === 0
      ? 0
      : Math.round(
          (Math.max(bullishScore, bearishScore) /
            totalSignals) *
            100
        );

  return {
    symbol: indicators.symbol,
    timeframe: indicators.timeframe,
    timestamp: indicators.timestamp,
    regime,
    confidence,
    reasons,
  };
}