export type TradeSetupDirection =
  | "LONG"
  | "SHORT";

export type TradeSetup = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  direction: TradeSetupDirection;

  entryPrice: number;

  stopLossPrice: number;

  takeProfitPrice: number;

  takeProfit1Price: number;
  takeProfit2Price: number;

  stopDistance: number;

  stopDistancePercent: number;

  riskRewardRatio: number;

  riskRewardRatioTP1: number;
  riskRewardRatioTP2: number;

  atr: number;

  atrMultiplier: number;
};