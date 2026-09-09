import { TradingSignal } from "@/lib/trading/signal/types";
import { calculateSignalRisk } from "@/lib/trading/risk/signal-risk";
import { CompleteTradePlan } from "@/lib/trading/plan/types";

export type ManualTradePlanInput = {
  symbol: string;
  timeframe: string;
  direction: "LONG" | "SHORT";

  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;

  accountBalance: number;
  riskPercent: number;

  leverage?: number;
  feePercent?: number;
  slippagePercent?: number;
};

export function generateManualTradePlan(
  input: ManualTradePlanInput
): CompleteTradePlan {
  const {
    symbol,
    timeframe,
    direction,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    accountBalance,
    riskPercent,
    leverage = 1,
    feePercent,
    slippagePercent,
  } = input;

  const stopDistance = Math.abs(
    entryPrice - stopLossPrice
  );

  const stopDistancePercent =
    (stopDistance / entryPrice) * 100;

  const riskRewardRatio =
    Math.abs(
      takeProfitPrice - entryPrice
    ) / stopDistance;

  const signal: TradingSignal = {
    symbol,
    timeframe,
    timestamp: new Date().toISOString(),
    direction,
    summary: "Manual trade setup",
    confidence: 100,
    confidenceLevel: "HIGH",
    status: "ACTIVE",
    quality: "VALID",
    reasons: [
      {
        factor: "MANUAL",
        direction:
          direction === "LONG"
            ? "BULLISH"
            : "BEARISH",
        message:
          "Trade setup was manually defined by the trader",
      },
    ],
    invalidation: null,
  };

  const setup = {
    symbol,
    timeframe,
    timestamp: signal.timestamp,
    direction,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    stopDistance,
    stopDistancePercent,
    riskRewardRatio,
    atr: 0,
    atrMultiplier: 0,
  };

  const risk = calculateSignalRisk({
    signal,
    accountBalance,
    riskPercent,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    leverage,
    feePercent,
    slippagePercent,
  });

  return {
    signal,
    setup,
    risk,
  };
}