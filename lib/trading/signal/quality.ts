import { MarketContext } from "@/lib/trading/context/types";
import {
  SignalDirection,
  SignalQuality,
} from "@/lib/trading/signal/types";

export type SignalQualityResult = {
  quality: SignalQuality;
  checks: string[];
};

export function evaluateSignalQuality(
  context: MarketContext,
  direction: SignalDirection
): SignalQualityResult {
  const checks: string[] = [];

  if (direction === "WAIT") {
    return {
      quality: "REJECTED",
      checks: [
        "No directional signal",
      ],
    };
  }

  const trend =
    context.alpha.trend.direction;

  const momentum =
    context.alpha.momentum.direction;

  const alphaScore =
    context.alphaScore.score;

  const volatility =
    context.alpha.volatility.level;

  let passedChecks = 0;

  // Trend confirmation
  if (
    (direction === "LONG" &&
      trend === "BULLISH") ||
    (direction === "SHORT" &&
      trend === "BEARISH")
  ) {
    passedChecks++;

    checks.push(
      "Trend confirms signal direction"
    );
  } else {
    checks.push(
      "Trend does not confirm signal direction"
    );
  }

  // Momentum confirmation
  if (
    (direction === "LONG" &&
      momentum === "BULLISH") ||
    (direction === "SHORT" &&
      momentum === "BEARISH")
  ) {
    passedChecks++;

    checks.push(
      "Momentum confirms signal direction"
    );
  } else {
    checks.push(
      "Momentum does not confirm signal direction"
    );
  }

  // Alpha score confirmation
  if (
    (direction === "LONG" &&
      alphaScore >= 40) ||
    (direction === "SHORT" &&
      alphaScore <= -40)
  ) {
    passedChecks++;

    checks.push(
      "Alpha score meets minimum threshold"
    );
  } else {
    checks.push(
      "Alpha score is below minimum threshold"
    );
  }

  // Volatility
  if (volatility === "HIGH") {
    checks.push(
      "High volatility limits signal quality"
    );
  } else {
    passedChecks++;

    checks.push(
      "Volatility is acceptable"
    );
  }

  // Reject weak confirmation
  if (passedChecks < 3) {
    return {
      quality: "REJECTED",
      checks,
    };
  }

  // High volatility prevents VALID
  if (volatility === "HIGH") {
    return {
      quality: "WEAK",
      checks,
    };
  }

  // Strong confirmation
  if (passedChecks === 4) {
    return {
      quality: "VALID",
      checks,
    };
  }

  return {
    quality: "WEAK",
    checks,
  };
}