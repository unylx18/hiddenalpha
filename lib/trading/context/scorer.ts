import {
  MarketContextBase,
  MarketBias,
  MarketContextScore,
} from "@/lib/trading/context/types";

export function scoreMarketContext(
  context: MarketContextBase
): MarketContextScore {
  let score = 0;
  const reasons: string[] = [];

  const {
    price,
    ema20,
    ema50,
    rsi14,
  } = context.indicators;

  // Trend
  if (ema20 !== null && ema50 !== null) {
    if (ema20 > ema50) {
      score += 2;
      reasons.push("EMA20 is above EMA50");
    } else {
      score -= 2;
      reasons.push("EMA20 is below EMA50");
    }
  }

  // Price vs EMA20
  if (ema20 !== null) {
    if (price > ema20) {
      score += 1;
      reasons.push("Price is above EMA20");
    } else {
      score -= 1;
      reasons.push("Price is below EMA20");
    }
  }

  // Momentum
  if (rsi14 !== null) {
    if (rsi14 >= 55 && rsi14 < 70) {
      score += 1;
      reasons.push("RSI supports bullish momentum");
    } else if (rsi14 <= 45 && rsi14 > 30) {
      score -= 1;
      reasons.push("RSI supports bearish momentum");
    } else if (rsi14 >= 70) {
      reasons.push("RSI is overbought");
    } else if (rsi14 <= 30) {
      reasons.push("RSI is oversold");
    }
  }

  // Volume confirmation
  if (context.volume.condition === "HIGH") {
    if (score > 0) {
      score += 1;
      reasons.push(
        "High volume confirms bullish pressure"
      );
    } else if (score < 0) {
      score -= 1;
      reasons.push(
        "High volume confirms bearish pressure"
      );
    } else {
      reasons.push(
        "High volume detected without directional bias"
      );
    }
  }

  // Final bias
  let bias: MarketBias = "NEUTRAL";

  if (score >= 2) {
    bias = "BULLISH";
  } else if (score <= -2) {
    bias = "BEARISH";
  }

  // Internal evidence consistency score.
  const confidence = Math.min(
    100,
    Math.round((Math.abs(score) / 5) * 100)
  );

  return {
    bias,
    score,
    confidence,
    reasons,
  };
}