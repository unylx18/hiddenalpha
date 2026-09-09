import {
  TimeframeAnalysis,
  MultiTimeframeResult,
} from "@/lib/trading/mtf/types";

export function calculateMultiTimeframe(
  symbol: string,
  analyses: TimeframeAnalysis[]
): MultiTimeframeResult {
  if (analyses.length === 0) {
    throw new Error(
      "At least one timeframe analysis is required"
    );
  }

  let bullish = 0;
  let bearish = 0;

  const reasons: string[] = [];

  for (const analysis of analyses) {
    if (analysis.bias === "BULLISH") {
      bullish++;
    }

    if (analysis.bias === "BEARISH") {
      bearish++;
    }

    reasons.push(
      `${analysis.timeframe} ${analysis.role}: ${analysis.bias}`
    );
  }

  let overallBias:
    | "BULLISH"
    | "BEARISH"
    | "NEUTRAL" = "NEUTRAL";

  if (bullish > bearish) {
    overallBias = "BULLISH";
  } else if (bearish > bullish) {
    overallBias = "BEARISH";
  }

  const alignment =
    Math.round(
      (Math.max(bullish, bearish) /
        analyses.length) *
        100
    );

  const totalConfidence =
    analyses.reduce(
      (sum, analysis) =>
        sum + analysis.confidence,
      0
    );

  const confidence =
    Math.round(
      totalConfidence /
        analyses.length
    );

  if (alignment >= 75) {
    reasons.push(
      "Multi-timeframe alignment is strong"
    );
  } else if (alignment >= 50) {
    reasons.push(
      "Multi-timeframe alignment is moderate"
    );
  } else {
    reasons.push(
      "Multi-timeframe alignment is weak"
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