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

  leverage?: number;

  feePercent?: number;
  slippagePercent?: number;
};

export function calculateSignalRisk(
  input: SignalRiskInput
): RiskCalculationResult {
  const {
    signal,
    accountBalance,
    riskPercent,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
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

  const riskInput: RiskCalculationInput = {
    direction: signal.direction,

    accountBalance,
    riskPercent,

    entryPrice,
    stopLossPrice,
    takeProfitPrice,

    leverage,

    feePercent,
    slippagePercent,
  };

  return calculateRisk(riskInput);
}