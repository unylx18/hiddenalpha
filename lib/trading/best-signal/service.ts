import { generateTradePlan } from "@/lib/trading/plan/trade-plan-service";
import {
  rankSignalCandidate,
  selectBestSignal,
} from "@/lib/trading/best-signal/calculator";
import {
  BestSignalCandidate,
  BestSignalResult,
} from "@/lib/trading/best-signal/types";

const TIMEFRAMES = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
];

type GenerateBestSignalParams = {
  symbol: string;
  accountBalance: number;
  riskPercent: number;
  leverage: number;
};

export async function generateBestSignal({
  symbol,
  accountBalance,
  riskPercent,
  leverage,
}: GenerateBestSignalParams): Promise<BestSignalResult> {
  const candidates: BestSignalCandidate[] = [];

  for (const timeframe of TIMEFRAMES) {
    try {
      const tradePlan =
        await generateTradePlan({
          symbol,
          timeframe,
          accountBalance,
          riskPercent,
          leverage,
        });

      const candidate =
        rankSignalCandidate(
          tradePlan.signal,
          tradePlan.setup,
          tradePlan.risk
        );

      if (
        Number.isFinite(
          candidate.rankingScore
        )
      ) {
        candidates.push(candidate);
      }
    } catch {
      // Ignore individual timeframe failures.
    }
  }

  const bestSignal =
    selectBestSignal(candidates);

  return {
    symbol,
    timestamp:
      new Date().toISOString(),

    signal:
      bestSignal?.signal ?? null,

    setup:
      bestSignal?.setup ?? null,

    risk:
      bestSignal?.risk ?? null,

    rankingScore:
      bestSignal
        ? bestSignal.rankingScore
        : null,

    candidates,
  };
}