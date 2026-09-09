import { getMarketContext } from "@/lib/trading/services/context-service";
import {
  calculateWeightedMultiTimeframe,
} from "@/lib/trading/mtf/weighted-calculator";
import {
  TimeframeAnalysis,
  TimeframeRole,
} from "@/lib/trading/mtf/types";

const TIMEFRAME_CONFIG: {
  timeframe: string;
  role: TimeframeRole;
}[] = [
  {
    timeframe: "1h",
    role: "MACRO",
  },
  {
    timeframe: "15m",
    role: "SETUP",
  },
  {
    timeframe: "5m",
    role: "CONFIRMATION",
  },
  {
    timeframe: "1m",
    role: "ENTRY",
  },
];

export async function getMultiTimeframeAnalysis(
  symbol: string
) {
  const analyses: TimeframeAnalysis[] = [];

  for (const config of TIMEFRAME_CONFIG) {
    try {
      const context =
        await getMarketContext(
          symbol,
          config.timeframe
        );

      analyses.push({
        timeframe: config.timeframe,

        role: config.role,

        bias:
          context.alphaScore.bias,

        score:
          context.alphaScore.score,

        confidence:
          context.alphaScore.confidence,
      });
    } catch (error) {
      throw new Error(
        `Failed to analyze ${symbol} ${config.timeframe}: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }
  }

  return calculateWeightedMultiTimeframe(
  symbol,
  analyses
);
}