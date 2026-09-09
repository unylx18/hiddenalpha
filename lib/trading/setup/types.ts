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

  stopDistance: number;

  stopDistancePercent: number;

  riskRewardRatio: number;

  atr: number;

  atrMultiplier: number;
};