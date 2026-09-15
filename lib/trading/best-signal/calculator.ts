import { BestSignalCandidate } from "@/lib/trading/best-signal/types";
import { TradingSignal } from "@/lib/trading/signal/types";
import { TradeSetup } from "@/lib/trading/setup/types";
import { RiskCalculationResult } from "@/lib/trading/risk/types";

const TIMEFRAME_WEIGHT: Record<string, number> = {
  "1m": 0.5,
  "3m": 0.7,
  "5m": 0.9,
  "15m": 1.0,
  "30m": 1.0,
  "1h": 1.1,
  "4h": 1.2,
};

function calculateRankingScore(
  signal: TradingSignal,
  setup: TradeSetup | null
) {
  if (
    signal.direction !== "LONG" &&
    signal.direction !== "SHORT"
  ) {
    return -Infinity;
  }

  if (signal.quality === "REJECTED") {
    return -Infinity;
  }

  const confidenceScore =
    signal.confidence * 0.6;

  const qualityScore =
    signal.quality === "VALID"
      ? 25
      : 10;

  const timeframeScore =
    (TIMEFRAME_WEIGHT[signal.timeframe] ?? 0.5) *
    10;

  const rrScore = setup
    ? Math.min(
        setup.riskRewardRatioTP2 * 5,
        15
      )
    : 0;

  return (
    confidenceScore +
    qualityScore +
    timeframeScore +
    rrScore
  );
}

export function rankSignalCandidate(
  signal: TradingSignal,
  setup: TradeSetup | null,
  risk: RiskCalculationResult | null
): BestSignalCandidate {
  return {
    signal,
    setup,
    risk,
    rankingScore: calculateRankingScore(
      signal,
      setup
    ),
  };
}

export function selectBestSignal(
  candidates: BestSignalCandidate[]
): BestSignalCandidate | null {
  const validCandidates =
    candidates
      .filter(
        (candidate) =>
          Number.isFinite(
            candidate.rankingScore
          )
      )
      .sort(
        (a, b) =>
          b.rankingScore -
          a.rankingScore
      );

  return validCandidates[0] ?? null;
}