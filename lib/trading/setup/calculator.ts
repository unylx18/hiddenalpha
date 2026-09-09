import { MarketContext } from "@/lib/trading/context/types";
import { TradeSetup } from "@/lib/trading/setup/types";

const DEFAULT_ATR_MULTIPLIER = 1.5;
const DEFAULT_RISK_REWARD = 2;

export function calculateTradeSetup(
  context: MarketContext,
  direction: "LONG" | "SHORT"
): TradeSetup {
  const entryPrice =
    context.indicators.price;

  const atr =
    context.indicators.atr14;

  if (atr === null || atr <= 0) {
    throw new Error(
      "ATR is required to calculate trade setup"
    );
  }

  const atrMultiplier =
    DEFAULT_ATR_MULTIPLIER;

  const riskRewardRatio =
    DEFAULT_RISK_REWARD;

  const stopDistance =
    atr * atrMultiplier;

  let stopLossPrice: number;
  let takeProfitPrice: number;

  if (direction === "LONG") {
    stopLossPrice =
      entryPrice - stopDistance;

    takeProfitPrice =
      entryPrice +
      stopDistance *
        riskRewardRatio;
  } else {
    stopLossPrice =
      entryPrice + stopDistance;

    takeProfitPrice =
      entryPrice -
      stopDistance *
        riskRewardRatio;
  }

  const stopDistancePercent =
    (stopDistance / entryPrice) * 100;

  return {
    symbol: context.symbol,
    timeframe: context.timeframe,
    timestamp: context.timestamp,

    direction,

    entryPrice,

    stopLossPrice,

    takeProfitPrice,

    stopDistance,

    stopDistancePercent,

    riskRewardRatio,

    atr,

    atrMultiplier,
  };
}