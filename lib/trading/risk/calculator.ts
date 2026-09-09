import {
  RiskCalculationInput,
  RiskCalculationResult,
} from "@/lib/trading/risk/types";

const MAX_RISK_PERCENT = 5;
const MAX_POSITION_VALUE_MULTIPLIER = 10;
const MIN_RISK_REWARD = 1;

const DEFAULT_FEE_PERCENT = 0.1;
const DEFAULT_SLIPPAGE_PERCENT = 0.1;

export function calculateRisk(
  input: RiskCalculationInput
): RiskCalculationResult {
  const {
    direction,
    accountBalance,
    riskPercent,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    leverage = 1,

    feePercent = DEFAULT_FEE_PERCENT,
    slippagePercent = DEFAULT_SLIPPAGE_PERCENT,
  } = input;

  if (accountBalance <= 0) {
    throw new Error(
      "Account balance must be greater than 0"
    );
  }

  if (
    riskPercent <= 0 ||
    riskPercent > MAX_RISK_PERCENT
  ) {
    throw new Error(
      `Risk percent must be between 0 and ${MAX_RISK_PERCENT}%`
    );
  }

  if (entryPrice <= 0) {
    throw new Error(
      "Entry price must be greater than 0"
    );
  }

  if (stopLossPrice <= 0) {
    throw new Error(
      "Stop loss price must be greater than 0"
    );
  }

  if (leverage <= 0) {
    throw new Error(
      "Leverage must be greater than 0"
    );
  }

  if (
    feePercent < 0 ||
    slippagePercent < 0
  ) {
    throw new Error(
      "Fee and slippage cannot be negative"
    );
  }

  if (direction === "LONG") {
    if (stopLossPrice >= entryPrice) {
      throw new Error(
        "For LONG, stop loss must be below entry price"
      );
    }

    if (
      takeProfitPrice !== undefined &&
      takeProfitPrice <= entryPrice
    ) {
      throw new Error(
        "For LONG, take profit must be above entry price"
      );
    }
  }

  if (direction === "SHORT") {
    if (stopLossPrice <= entryPrice) {
      throw new Error(
        "For SHORT, stop loss must be above entry price"
      );
    }

    if (
      takeProfitPrice !== undefined &&
      takeProfitPrice >= entryPrice
    ) {
      throw new Error(
        "For SHORT, take profit must be below entry price"
      );
    }
  }

  const riskAmount =
    accountBalance * (riskPercent / 100);

  const stopDistance =
    Math.abs(
      entryPrice - stopLossPrice
    );

  const stopDistancePercent =
    (stopDistance / entryPrice) * 100;

  const positionSize =
    riskAmount / stopDistance;

  const positionValue =
    positionSize * entryPrice;

  const maxPositionValue =
    accountBalance *
    MAX_POSITION_VALUE_MULTIPLIER;

  if (positionValue > maxPositionValue) {
    throw new Error(
      `Position value exceeds ${MAX_POSITION_VALUE_MULTIPLIER}x account balance`
    );
  }

  const marginRequired =
    positionValue / leverage;

  const estimatedFees =
    positionValue *
    (feePercent / 100);

  const estimatedSlippage =
    positionValue *
    (slippagePercent / 100);

  const totalEstimatedCost =
    estimatedFees +
    estimatedSlippage;

  const potentialLoss =
    positionSize * stopDistance;

  let potentialProfit:
    number | null = null;

  let riskRewardRatio:
    number | null = null;

  if (
    takeProfitPrice !== undefined &&
    takeProfitPrice > 0
  ) {
    const targetDistance =
      Math.abs(
        takeProfitPrice - entryPrice
      );

    potentialProfit =
      positionSize * targetDistance;

    riskRewardRatio =
      targetDistance / stopDistance;

    if (
      riskRewardRatio < MIN_RISK_REWARD
    ) {
      throw new Error(
        `Risk reward ratio must be at least ${MIN_RISK_REWARD}R`
      );
    }
  }

  return {
    direction,

    accountBalance,

    riskPercent,

    riskAmount,

    entryPrice,

    stopLossPrice,

    takeProfitPrice:
      takeProfitPrice ?? null,

    stopDistance,

    stopDistancePercent,

    positionSize,

    positionValue,

    leverage,

    marginRequired,

    feePercent,

    slippagePercent,

    estimatedFees,

    estimatedSlippage,

    totalEstimatedCost,

    potentialLoss,

    potentialProfit,

    riskRewardRatio,
  };
}