import { TradingSignal } from "@/lib/trading/signal/types";
import {
  RiskCalculationInput,
  RiskCalculationResult,
} from "@/lib/trading/risk/types";
import { calculateRisk } from "@/lib/trading/risk/calculator";

export type SignalRiskInput = {
  signal: TradingSignal;

  accountBalance: number;
  riskPercent: number;

  entryPrice: number;
  stopLossPrice: number;

  takeProfitPrice?: number;

  takeProfit1Price?: number;
  takeProfit2Price?: number;

  leverage?: number;

  feePercent?: number;
  slippagePercent?: number;
};

export type SignalRiskResult =
  RiskCalculationResult & {
    takeProfit1Price?: number;
    takeProfit2Price?: number;

    potentialProfitTP1?: number;
    potentialProfitTP2?: number;

    riskRewardRatioTP1?: number;
    riskRewardRatioTP2?: number;
  };

export function calculateSignalRisk(
  input: SignalRiskInput
): SignalRiskResult {
  const {
    signal,
    accountBalance,
    riskPercent,
    entryPrice,
    stopLossPrice,

    takeProfitPrice,

    takeProfit1Price,
    takeProfit2Price,

    leverage,

    feePercent,
    slippagePercent,
  } = input;

  if (
    signal.direction !== "LONG" &&
    signal.direction !== "SHORT"
  ) {
    throw new Error(
      "Risk calculation requires a LONG or SHORT signal"
    );
  }

  if (signal.quality === "REJECTED") {
    throw new Error(
      "Cannot calculate risk for a rejected signal"
    );
  }

  const tp2 =
    takeProfit2Price ??
    takeProfitPrice;

  const riskDistance = Math.abs(
    entryPrice - stopLossPrice
  );

  if (riskDistance <= 0) {
    throw new Error(
      "Entry and stop loss must be different"
    );
  }

  /*
   * Use the existing Risk Engine
   * to calculate the base position sizing.
   */
  const riskInput: RiskCalculationInput = {
    direction: signal.direction,

    accountBalance,
    riskPercent,

    entryPrice,
    stopLossPrice,

    takeProfitPrice: tp2,

    leverage,

    feePercent,
    slippagePercent,
  };

  const baseRisk = calculateRisk(riskInput);

  /*
   * Calculate TP1 / TP2 independently.
   */

  const calculateRR = (
    targetPrice?: number
  ): number | undefined => {
    if (
      targetPrice === undefined ||
      !Number.isFinite(targetPrice)
    ) {
      return undefined;
    }

    return (
      Math.abs(targetPrice - entryPrice) /
      riskDistance
    );
  };

  const calculatePotentialProfit = (
    targetPrice?: number
  ): number | undefined => {
    if (
      targetPrice === undefined ||
      !Number.isFinite(targetPrice)
    ) {
      return undefined;
    }

    /*
     * Position size is provided by the
     * existing Risk Engine.
     */
    const positionSize =
      "positionSize" in baseRisk
        ? Number(baseRisk.positionSize)
        : 0;

    if (!Number.isFinite(positionSize)) {
      return undefined;
    }

    return (
      Math.abs(targetPrice - entryPrice) *
      positionSize
    );
  };

  return {
    ...baseRisk,

    takeProfit1Price,
    takeProfit2Price: tp2,

    potentialProfitTP1:
      calculatePotentialProfit(
        takeProfit1Price
      ),

    potentialProfitTP2:
      calculatePotentialProfit(tp2),

    riskRewardRatioTP1:
      calculateRR(takeProfit1Price),

    riskRewardRatioTP2:
      calculateRR(tp2),
  };
}