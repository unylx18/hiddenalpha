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
    structure: number;
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

function calculateVolumeConfirmation(
  ratio: number
): number {
  if (!Number.isFinite(ratio)) {
    return 0;
  }

  if (ratio < 0.5) {
    return -1;
  }

  if (ratio < 0.7) {
    return -0.5;
  }

  if (ratio < 1.0) {
    return -0.25;
  }

  if (ratio < 1.5) {
    return 0.5;
  }

  if (ratio < 2.0) {
    return 0.8;
  }

  return 1;
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

  const structureDirection =
    directionToScore(
      context.structure.trend ===
        "RANGE"
        ? "NEUTRAL"
        : context.structure.trend
    );

  /*
   * Alpha Score weights
   *
   * Trend      30
   * Momentum   20
   * Volume     20
   * Structure  20
   * Volatility 10
   */

  const trendScore =
    trendDirection *
    context.trend.strength *
    0.30;

  const momentumScore =
    momentumDirection *
    context.momentum.strength *
    0.20;

  const volumeConfirmation =
    calculateVolumeConfirmation(
      context.volume.volumeRatio
    );

  const volumeDirection =
    trendDirection !== 0
      ? trendDirection
      : momentumDirection !== 0
        ? momentumDirection
        : structureDirection;

  const volumeScore =
    volumeConfirmation *
    volumeDirection *
    20;

  const structureScore =
    structureDirection *
    context.structure.strength *
    0.20;

  /*
   * Volatility is a risk/context factor.
   * It does not independently decide direction.
   */
  let volatilityScore = 0;

  if (
    context.volatility.level ===
    "HIGH"
  ) {
    volatilityScore = -10;
  } else if (
    context.volatility.level ===
    "LOW"
  ) {
    volatilityScore = 3;
  }

  const rawScore =
    trendScore +
    momentumScore +
    volumeScore +
    structureScore;

  const directionalScore =
    rawScore >= 0
      ? rawScore + volatilityScore
      : rawScore - volatilityScore;

  const normalizedScore =
    Math.max(
      -100,
      Math.min(
        100,
        Math.round(
          directionalScore
        )
      )
    );

  let bias: AlphaDirection =
    "NEUTRAL";

  if (
    normalizedScore >= 20
  ) {
    bias = "BULLISH";
  } else if (
    normalizedScore <= -20
  ) {
    bias = "BEARISH";
  }

  /*
   * High volatility reduces confidence.
   */
  let confidence = Math.abs(
    normalizedScore
  );

  if (
    context.volatility.level ===
    "HIGH"
  ) {
    confidence = Math.max(
      0,
      confidence - 10
    );
  }

  const reasons: string[] = [
    ...context.trend.reasons,
    ...context.momentum.reasons,
    ...context.structure.reasons,
  ];

  const ratio =
    context.volume.volumeRatio;

  if (ratio < 0.7) {
    reasons.push(
      `Volume is weak at ${ratio.toFixed(
        2
      )}x average`
    );
  } else if (ratio >= 1.5) {
    reasons.push(
      `Volume strongly confirms the move at ${ratio.toFixed(
        2
      )}x average`
    );
  } else {
    reasons.push(
      `Volume is at ${ratio.toFixed(
        2
      )}x average`
    );
  }

  if (
    context.volatility.level ===
    "HIGH"
  ) {
    reasons.push(
      "High volatility increases trade risk"
    );
  }

  return {
    score: normalizedScore,
    bias,
    confidence,
    components: {
      trend: Math.round(
        trendScore
      ),
      momentum: Math.round(
        momentumScore
      ),
      volume: Math.round(
        volumeScore
      ),
      structure: Math.round(
        structureScore
      ),
      volatility:
        Math.round(
          volatilityScore
        ),
    },
    reasons,
  };
}