import { TradingSignal } from "@/lib/trading/signal/types";
import { TradeSetup } from "@/lib/trading/setup/types";
import { RiskCalculationResult } from "@/lib/trading/risk/types";

export type BestSignalCandidate = {
  signal: TradingSignal;
  setup: TradeSetup | null;
  risk: RiskCalculationResult | null;
  rankingScore: number;
};

export type BestSignalResult = {
  symbol: string;
  timestamp: string;

  signal: TradingSignal | null;
  setup: TradeSetup | null;
  risk: RiskCalculationResult | null;

  rankingScore: number | null;

  candidates: BestSignalCandidate[];
};