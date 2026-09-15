import { TradingSignal } from "@/lib/trading/signal/types";
import { TradeSetup } from "@/lib/trading/setup/types";
import { RiskCalculationResult } from "@/lib/trading/risk/types";

export type CompleteTradePlan = {
  signal: TradingSignal;

  setup: TradeSetup | null;

  risk: RiskCalculationResult | null;
};