export type RiskDirection =
  | "LONG"
  | "SHORT";

export type RiskCalculationInput = {
  direction: RiskDirection;

  accountBalance: number;

  riskPercent: number;

  entryPrice: number;

  stopLossPrice: number;

  takeProfitPrice?: number;

  leverage?: number;

  feePercent?: number;

  slippagePercent?: number;
};

export type RiskCalculationResult = {
  direction: RiskDirection;

  accountBalance: number;

  riskPercent: number;

  riskAmount: number;

  entryPrice: number;

  stopLossPrice: number;

  takeProfitPrice: number | null;

  stopDistance: number;

  stopDistancePercent: number;

  positionSize: number;

  positionValue: number;

  leverage: number;

  marginRequired: number;

  feePercent: number;

  slippagePercent: number;

  estimatedFees: number;

  estimatedSlippage: number;

  totalEstimatedCost: number;

  potentialLoss: number;

  potentialProfit: number | null;

  riskRewardRatio: number | null;
};