import {
  MultiTimeframeResult,
  TimeframeAnalysis,
} from "@/lib/trading/mtf/types";

const TIMEFRAME_WEIGHTS: Record<string, number> = {
  "1h": 0.4,
  "15m": 0.3,
  "5m": 0.2,
  "1m": 0.1,
};

export function calculateWeightedMultiTimeframe(
  symbol: string,
  analyses: TimeframeAnalysis[]
): MultiTimeframeResult {
  if (analyses.length === 0) {
    throw new Error(
      "At least one timeframe analysis is required"
    );
  }

  let weightedScore = 0;
  let weightedConfidence = 0;
  let totalWeight = 0;

  const reasons: string[] = [];

  for (const analysis of analyses) {
    const weight =
      TIMEFRAME_WEIGHTS[analysis.timeframe] ?? 0;

    if (weight === 0) {
      continue;
    }

    weightedScore +=
      analysis.score * weight;

    weightedConfidence +=
      analysis.confidence * weight;

    totalWeight += weight;

    reasons.push(
      `${analysis.timeframe} ${analysis.role}: ${analysis.bias} (${Math.round(weight * 100)}% weight)`
    );
  }

  if (totalWeight === 0) {
    throw new Error(
      "No supported timeframes were provided"
    );
  }

  const score = Math.round(
    weightedScore / totalWeight
  );

  const confidence = Math.round(
    weightedConfidence / totalWeight
  );

  let overallBias:
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL" = "NEUTRAL";

  if (score >= 20) {
    overallBias = "BULLISH";
  } else if (score <= -20) {
    overallBias = "BEARISH";
  }

  const bullishWeight = analyses
    .filter(
      (analysis) =>
        analysis.bias === "BULLISH"
    )
    .reduce(
      (sum, analysis) =>
        sum +
        (TIMEFRAME_WEIGHTS[
          analysis.timeframe
        ] ?? 0),
      0
    );

  const bearishWeight = analyses
    .filter(
      (analysis) =>
        analysis.bias === "BEARISH"
    )
    .reduce(
      (sum, analysis) =>
        sum +
        (TIMEFRAME_WEIGHTS[
          analysis.timeframe
        ] ?? 0),
      0
    );

  const alignment = Math.round(
    Math.max(
      bullishWeight,
      bearishWeight
    ) * 100
  );

  if (alignment >= 75) {
    reasons.push(
      "Weighted multi-timeframe alignment is strong"
    );
  } else if (alignment >= 50) {
    reasons.push(
      "Weighted multi-timeframe alignment is moderate"
    );
  } else {
    reasons.push(
      "Weighted multi-timeframe alignment is weak"
    );
  }

  return {
    symbol,
    overallBias,
    alignment,
    confidence,
    analyses,
    reasons,
  };
}