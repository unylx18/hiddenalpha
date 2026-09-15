import { MarketContext } from "@/lib/trading/context/types";
import { TradeSetup } from "@/lib/trading/setup/types";

const DEFAULT_ATR_MULTIPLIER = 1.5;

const TP1_RISK_REWARD = 1;
const TP2_RISK_REWARD = 2;

export function calculateTradeSetup(
  context: MarketContext,
  direction: "LONG" | "SHORT"
): TradeSetup {
  const entryPrice =
    context.indicators.price;

  const atr =
    context.indicators.atr14;

  if (
    atr === null ||
    atr <= 0
  ) {
    throw new Error(
      "ATR is required to calculate trade setup"
    );
  }

  const atrMultiplier =
    DEFAULT_ATR_MULTIPLIER;

  const stopDistance =
    atr * atrMultiplier;

  let stopLossPrice: number;
  let takeProfit1Price: number;
  let takeProfit2Price: number;

  if (direction === "LONG") {
    stopLossPrice =
      entryPrice - stopDistance;

    takeProfit1Price =
      entryPrice +
      stopDistance *
        TP1_RISK_REWARD;

    takeProfit2Price =
      entryPrice +
      stopDistance *
        TP2_RISK_REWARD;
  } else {
    stopLossPrice =
      entryPrice + stopDistance;

    takeProfit1Price =
      entryPrice -
      stopDistance *
        TP1_RISK_REWARD;

    takeProfit2Price =
      entryPrice -
      stopDistance *
        TP2_RISK_REWARD;
  }

  const stopDistancePercent =
    (stopDistance /
      entryPrice) *
    100;

  return {
    symbol: context.symbol,
    timeframe: context.timeframe,
    timestamp: context.timestamp,

    direction,

    entryPrice,

    stopLossPrice,

    /*
     * Keep takeProfitPrice as TP2
     * for backward compatibility with
     * the existing Risk Engine.
     */
    takeProfitPrice:
      takeProfit2Price,

    takeProfit1Price,
    takeProfit2Price,

    stopDistance,

    stopDistancePercent,

    riskRewardRatio:
      TP2_RISK_REWARD,

    riskRewardRatioTP1:
      TP1_RISK_REWARD,

    riskRewardRatioTP2:
      TP2_RISK_REWARD,

    atr,

    atrMultiplier,
  };
}