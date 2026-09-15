import { getMarketContext } from "@/lib/trading/services/context-service";
import { decideSignal } from "@/lib/trading/signal/decision";
import {
  SignalReason,
  TradingSignal,
} from "@/lib/trading/signal/types";
import { evaluateSignalQuality } from "@/lib/trading/signal/quality";
import { getMultiTimeframeAnalysis } from "@/lib/trading/mtf/service";
import { finalizeSignal } from "@/lib/trading/signal/final-decision";
import { calculateTradeSetup } from "@/lib/trading/setup/calculator";
import { calculateSignalRisk } from "@/lib/trading/risk/signal-risk";
import { CompleteTradePlan } from "@/lib/trading/plan/types";

export type TradePlanInput = {
  symbol: string;
  timeframe: string;
  accountBalance: number;
  riskPercent: number;
  leverage?: number;
  feePercent?: number;
  slippagePercent?: number;
};

export async function generateTradePlan(
  input: TradePlanInput
): Promise<CompleteTradePlan> {
  const {
    symbol,
    timeframe,
    accountBalance,
    riskPercent,
    leverage,
    feePercent,
    slippagePercent,
  } = input;

  /*
   * 1. Market Context
   */
  const context =
    await getMarketContext(
      symbol,
      timeframe
    );

  /*
   * 2. Initial Signal
   */
  const signalDecision =
    decideSignal(context);

  /*
   * 3. Signal Quality
   */
  const quality =
    evaluateSignalQuality(
      context,
      signalDecision.direction
    );

  const baseSignal: TradingSignal = {
    ...signalDecision,
    quality: quality.quality,
  };

  /*
   * 4. WAIT
   *
   * WAIT is a valid market state,
   * not an application error.
   */
  if (
    baseSignal.direction === "WAIT"
  ) {
    return {
      signal: baseSignal,
      setup: null,
      risk: null,
    } as CompleteTradePlan;
  }

  /*
   * 5. Multi-Timeframe Confirmation
   */
  const mtf =
    await getMultiTimeframeAnalysis(
      symbol
    );

  /*
   * 6. Final Decision
   */
  const finalDecision =
    finalizeSignal(
      baseSignal,
      mtf
    );

  /*
   * 7. Final confirmation failed
   *
   * Return WAIT instead of throwing.
   */
  if (
    !finalDecision.approved ||
    (
      finalDecision.direction !== "LONG" &&
      finalDecision.direction !== "SHORT"
    )
  ) {
    const finalReason: SignalReason = {
      factor: "FINAL_DECISION",
      direction: "NEUTRAL",
      message:
        finalDecision.reasons[
          finalDecision.reasons.length - 1
        ] ??
        "Signal did not pass final confirmation",
    };

    const waitSignal: TradingSignal = {
      ...baseSignal,

      direction: "WAIT",

      summary:
        "The setup does not have sufficient confirmation",

      confidence:
        finalDecision.confidence,

      reasons: [
        ...baseSignal.reasons,
        finalReason,
      ],

      invalidation: null,

      entryPrice: undefined,
      stopLossPrice: undefined,
      takeProfitPrice: undefined,
      takeProfit1Price: undefined,
      takeProfit2Price: undefined,
      riskRewardRatioTP1: undefined,
      riskRewardRatioTP2: undefined,
    };

    return {
      signal: waitSignal,
      setup: null,
      risk: null,
    } as CompleteTradePlan;
  }

  /*
   * 8. Trade Setup
   */
  const setup =
    calculateTradeSetup(
      context,
      finalDecision.direction
    );

  /*
   * 9. Final Signal
   */
  const finalReason: SignalReason = {
    factor: "FINAL_DECISION",
    direction:
      finalDecision.direction === "LONG"
        ? "BULLISH"
        : "BEARISH",
    message:
      "Signal passed final confirmation",
  };

  const signal: TradingSignal = {
    ...baseSignal,

    confidence:
      finalDecision.confidence,

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

    reasons: [
      ...baseSignal.reasons,
      finalReason,
    ],
  };

  /*
   * 10. Risk Engine
   */
  const risk =
    calculateSignalRisk({
      signal,

      accountBalance,
      riskPercent,

      entryPrice:
        setup.entryPrice,

      stopLossPrice:
        setup.stopLossPrice,

      takeProfitPrice:
        setup.takeProfit2Price,

      takeProfit1Price:
        setup.takeProfit1Price,

      takeProfit2Price:
        setup.takeProfit2Price,

      leverage,
      feePercent,
      slippagePercent,
    });

  /*
   * 11. Complete Trade Plan
   */
  return {
    signal,
    setup,
    risk,
  };
}