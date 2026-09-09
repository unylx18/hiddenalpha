import { IndicatorResult } from "@/lib/trading/types/indicator";
import { calculateVolatilityContext } from "@/lib/trading/context/volatility-calculator";
import {
  AlphaContext,
  AlphaDirection,
  TrendContext,
  MomentumContext,
} from "@/lib/trading/context/alpha-types";

function calculateTrend(
  indicators: IndicatorResult
): TrendContext {
  const {
    price,
    ema20,
    ema50,
  } = indicators;

  const reasons: string[] = [];

  let bullishPoints = 0;
  let bearishPoints = 0;

  if (ema20 !== null) {
    if (price > ema20) {
      bullishPoints++;
      reasons.push("Price is above EMA20");
    } else {
      bearishPoints++;
      reasons.push("Price is below EMA20");
    }
  }

  if (ema20 !== null && ema50 !== null) {
    if (ema20 > ema50) {
      bullishPoints++;
      reasons.push("EMA20 is above EMA50");
    } else {
      bearishPoints++;
      reasons.push("EMA20 is below EMA50");
    }
  }

  let direction: AlphaDirection = "NEUTRAL";

  if (bullishPoints > bearishPoints) {
    direction = "BULLISH";
  } else if (bearishPoints > bullishPoints) {
    direction = "BEARISH";
  }

  const totalPoints =
    bullishPoints + bearishPoints;

  const strength =
    totalPoints === 0
      ? 0
      : Math.round(
          (Math.max(
            bullishPoints,
            bearishPoints
          ) /
            totalPoints) *
            100
        );

  return {
    direction,
    strength,
    reasons,
  };
}

function calculateMomentum(
  indicators: IndicatorResult
): MomentumContext {
  const { rsi14 } = indicators;

  const reasons: string[] = [];

  let direction: AlphaDirection = "NEUTRAL";
  let strength = 0;

  if (rsi14 !== null) {
    if (rsi14 >= 55 && rsi14 < 70) {
      direction = "BULLISH";
      strength = Math.round(
        ((rsi14 - 50) / 20) * 100
      );

      reasons.push(
        "RSI supports bullish momentum"
      );
    } else if (rsi14 <= 45 && rsi14 > 30) {
      direction = "BEARISH";
      strength = Math.round(
        ((50 - rsi14) / 20) * 100
      );

      reasons.push(
        "RSI supports bearish momentum"
      );
    } else if (rsi14 >= 70) {
      direction = "BULLISH";
      strength = 100;

      reasons.push(
        "RSI is strongly bullish but overbought"
      );
    } else if (rsi14 <= 30) {
      direction = "BEARISH";
      strength = 100;

      reasons.push(
        "RSI is strongly bearish but oversold"
      );
    } else {
      reasons.push(
        "RSI is in a neutral momentum zone"
      );
    }
  }

  return {
    direction,
    strength,
    reasons,
  };
}

export function calculateAlphaContext(
  indicators: IndicatorResult
): AlphaContext {
  const trend = calculateTrend(indicators);

const momentum = calculateMomentum(
  indicators
);

const volatility =
  calculateVolatilityContext(
    indicators.price,
    indicators.atr14
  );

  return {
    symbol: indicators.symbol,
    timeframe: indicators.timeframe,
    timestamp: indicators.timestamp,

    trend,
    momentum,
    volatility,
  };
}