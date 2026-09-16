import type {
  TradingSignal,
} from "@/lib/trading/signal/types";

import type {
  TradeSetup,
} from "@/lib/trading/setup/types";

import type {
  RiskCalculationResult,
} from "@/lib/trading/risk/types";

import type {
  SignalFreshnessResult,
} from "@/lib/trading/freshness/types";

export type ScannerAssetResult = {
  symbol: string;

  available: boolean;

  signal: TradingSignal | null;
  setup: TradeSetup | null;
  risk: RiskCalculationResult | null;

  livePrice: number | null;

  freshness: SignalFreshnessResult | null;

  baseRankingScore: number | null;
  scannerScore: number | null;

  actionable: boolean;

  error: string | null;
};

export type OpportunityScannerResult = {
  timestamp: string;

  universe: string[];

  best: ScannerAssetResult | null;

  assets: ScannerAssetResult[];
};