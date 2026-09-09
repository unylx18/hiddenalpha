import { MarketContext } from "@/lib/trading/context/types";
import {
  SignalConfidence,
  SignalDirection,
  SignalReason,
  TradingSignal,
} from "@/lib/trading/signal/types";

function getConfidenceLevel(
  confidence: number
): SignalConfidence {
  if (confidence >= 75) {
    return "HIGH";
  }

  if (confidence >= 50) {
    return "MEDIUM";
  }

  return "LOW";
}

export function decideSignal(
  context: MarketContext
): Omit<TradingSignal, "quality"> {
  const reasons: SignalReason[] = [];

  const trend =
    context.alpha.trend.direction;

  const momentum =
    context.alpha.momentum.direction;

  const alphaScore =
    context.alphaScore.score;

  const volatility =
    context.alpha.volatility.level;

  let direction: SignalDirection = "WAIT";

  /*
   * LONG confirmation
   */
  if (
    trend === "BULLISH" &&
    momentum === "BULLISH" &&
    alphaScore >= 40
  ) {
    direction = "LONG";

    reasons.push({
      factor: "TREND",
      direction: "BULLISH",
      message:
        "Trend structure supports bullish continuation",
    });

    reasons.push({
      factor: "MOMENTUM",
      direction: "BULLISH",
      message:
        "Momentum confirms the bullish direction",
    });
  }

  /*
   * SHORT confirmation
   */
  else if (
    trend === "BEARISH" &&
    momentum === "BEARISH" &&
    alphaScore <= -40
  ) {
    direction = "SHORT";

    reasons.push({
      factor: "TREND",
      direction: "BEARISH",
      message:
        "Trend structure supports bearish continuation",
    });

    reasons.push({
      factor: "MOMENTUM",
      direction: "BEARISH",
      message:
        "Momentum confirms the bearish direction",
    });
  }

  /*
   * Alpha score confirmation
   */
  if (direction === "LONG") {
    reasons.push({
      factor: "ALPHA_SCORE",
      direction: "BULLISH",
      message:
        `Alpha score confirms bullish bias (${alphaScore})`,
    });
  }

  if (direction === "SHORT") {
    reasons.push({
      factor: "ALPHA_SCORE",
      direction: "BEARISH",
      message:
        `Alpha score confirms bearish bias (${alphaScore})`,
    });
  }

  /*
   * Volatility warning
   */
  if (volatility === "HIGH") {
    reasons.push({
      factor: "VOLATILITY",
      direction: "NEUTRAL",
      message:
        "High volatility detected; risk should be managed carefully",
    });
  }

  if (direction === "WAIT") {
    reasons.push({
      factor: "CONFIRMATION",
      direction: "NEUTRAL",
      message:
        "Directional confirmation is not strong enough",
    });
  }

  /*
   * Base confidence
   */
  let confidence =
    Math.abs(alphaScore);

  /*
   * High volatility reduces confidence.
   */
  if (volatility === "HIGH") {
    confidence -= 10;
  }

  confidence = Math.max(
    0,
    Math.min(100, confidence)
  );

  let summary = "Market confirmation is not strong enough";

  if (direction === "LONG") {
    summary =
      "Bullish trend and momentum are sufficiently aligned for a LONG setup";
  }

  if (direction === "SHORT") {
    summary =
      "Bearish trend and momentum are sufficiently aligned for a SHORT setup";
  }

  return {
    symbol: context.symbol,
    timeframe: context.timeframe,
    timestamp: context.timestamp,

    direction,

    summary,

    confidence,
    confidenceLevel:
      getConfidenceLevel(confidence),

    status: "ACTIVE",

    reasons,

    invalidation:
      direction === "LONG"
        ? "Bullish setup invalid if bullish market structure breaks"
        : direction === "SHORT"
          ? "Bearish setup invalid if bearish market structure breaks"
          : null,
  };
}