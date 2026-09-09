
import { generateTradeSetup } from "@/lib/trading/setup/service";
import { calculateSignalRisk } from "@/lib/trading/risk/signal-risk";
import { CompleteTradePlan } from "@/lib/trading/plan/types";

export type GenerateTradePlanInput = {
  symbol: string;
  timeframe: string;

  accountBalance: number;
  riskPercent: number;

  leverage?: number;

  feePercent?: number;
  slippagePercent?: number;
};

export async function generateTradePlan(
  input: GenerateTradePlanInput
): Promise<CompleteTradePlan> {
  const {
    symbol,
    timeframe,

    accountBalance,
    riskPercent,

    leverage = 1,

    feePercent,
    slippagePercent,
  } = input;

  const { signal, setup } =
    await generateTradeSetup(
      symbol,
      timeframe
    );

  const risk =
    calculateSignalRisk({
      signal,

      accountBalance,
      riskPercent,

      entryPrice: setup.entryPrice,

      stopLossPrice:
        setup.stopLossPrice,

      takeProfitPrice:
        setup.takeProfitPrice,

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