import {
  AlphaContext,
  AlphaDirection,
} from "@/lib/trading/context/alpha-types";

export type AlphaScoreResult = {
  score: number;
  bias: AlphaDirection;
  confidence: number;
  components: {
    trend: number;
    momentum: number;
    volume: number;
    volatility: number;
  };
  reasons: string[];
};

function directionToScore(
  direction: AlphaDirection
): number {
  if (direction === "BULLISH") {
    return 1;
  }

  if (direction === "BEARISH") {
    return -1;
  }

  return 0;
}

export function calculateAlphaScore(
  context: AlphaContext
): AlphaScoreResult {
  const trendDirection =
    directionToScore(
      context.trend.direction
    );

  const momentumDirection =
    directionToScore(
      context.momentum.direction
    );

  const trendScore =
    trendDirection *
    context.trend.strength *
    0.35;

  const momentumScore =
    momentumDirection *
    context.momentum.strength *
    0.25;

  let volumeScore = 0;

  if (
    context.volatility.level === "HIGH"
  ) {
    volumeScore = 0;
  }

  if (
    context.trend.direction !== "NEUTRAL" &&
    context.momentum.direction !== "NEUTRAL"
  ) {
    volumeScore = 20;
  }

  let volatilityScore = 0;

  if (
    context.volatility.level === "LOW"
  ) {
    volatilityScore = 10;
  } else if (
    context.volatility.level === "NORMAL"
  ) {
    volatilityScore = 20;
  } else {
    volatilityScore = 5;
  }

  const directionalScore =
    trendScore + momentumScore;

  const directionMultiplier =
    directionalScore >= 0 ? 1 : -1;

  const score = Math.round(
    directionalScore +
      volumeScore * directionMultiplier +
      volatilityScore * directionMultiplier
  );

  const normalizedScore = Math.max(
    -100,
    Math.min(100, score)
  );

  let bias: AlphaDirection = "NEUTRAL";

  if (normalizedScore >= 20) {
    bias = "BULLISH";
  } else if (normalizedScore <= -20) {
    bias = "BEARISH";
  }

  const confidence = Math.min(
    100,
    Math.abs(normalizedScore)
  );

  const reasons = [
    ...context.trend.reasons,
    ...context.momentum.reasons,
    ...context.volatility.reasons,
  ];

  return {
    score: normalizedScore,
    bias,
    confidence,
    components: {
      trend: Math.round(trendScore),
      momentum: Math.round(momentumScore),
      volume: Math.round(
        volumeScore * directionMultiplier
      ),
      volatility: Math.round(
        volatilityScore * directionMultiplier
      ),
    },
    reasons,
  };
}