import { getMarketContext } from "@/lib/trading/services/context-service";
import { decideSignal } from "@/lib/trading/signal/decision";
import { evaluateSignalQuality } from "@/lib/trading/signal/quality";
import { TradingSignal } from "@/lib/trading/signal/types";
import { getMultiTimeframeAnalysis } from "@/lib/trading/mtf/service";
import { finalizeSignal } from "@/lib/trading/signal/final-decision";
import { calculateTradeSetup } from "@/lib/trading/setup/calculator";

export async function generateSignal(
  symbol: string,
  timeframe: string
): Promise<TradingSignal> {
  const context = await getMarketContext(
    symbol,
    timeframe
  );

  const signal = decideSignal(context);

  const quality = evaluateSignalQuality(
    context,
    signal.direction
  );

  const baseSignal: TradingSignal = {
    ...signal,
    quality: quality.quality,
  };

  if (baseSignal.direction === "WAIT") {
    return baseSignal;
  }

  const mtf = await getMultiTimeframeAnalysis(
    symbol
  );

  const finalDecision = finalizeSignal(
    baseSignal,
    mtf
  );

  if (
    !finalDecision.approved ||
    (
      finalDecision.direction !== "LONG" &&
      finalDecision.direction !== "SHORT"
    )
  ) {
    return {
      ...baseSignal,
      direction: "WAIT",
      summary:
        "The setup does not have sufficient confirmation",
      confidence: finalDecision.confidence,
      reasons: [
        ...baseSignal.reasons,
        {
          factor: "FINAL_DECISION",
          direction: "NEUTRAL",
          message:
            finalDecision.reasons[
              finalDecision.reasons.length - 1
            ],
        },
      ],
      invalidation: null,
    };
  }

  const setup = calculateTradeSetup(
    context,
    finalDecision.direction
  );

  return {
    ...baseSignal,

    confidence:
      finalDecision.confidence,

    reasons: [
      ...baseSignal.reasons,
      {
        factor: "FINAL_DECISION",
        direction:
          finalDecision.direction === "LONG"
            ? "BULLISH"
            : "BEARISH",
        message:
          "Signal passed final confirmation",
      },
    ],

    entryPrice:
      setup.entryPrice,

    stopLossPrice:
      setup.stopLossPrice,

    takeProfitPrice:
      setup.takeProfitPrice,

    takeProfit1Price:
      setup.takeProfit1Price,

    takeProfit2Price:
      setup.takeProfit2Price,

    riskRewardRatioTP1:
      setup.riskRewardRatioTP1,

    riskRewardRatioTP2:
      setup.riskRewardRatioTP2,
  };
}