import {
  generateTradePlan,
} from "@/lib/trading/plan/trade-plan-service";

import {
  getBybitTicker,
} from "@/lib/market-data/bybit-ticker";

import {
  evaluateSignalFreshness,
} from "@/lib/trading/freshness/evaluator";

import type {
  ScannerAssetResult,
  OpportunityScannerResult,
} from "@/lib/trading/scanner/types";

const DEFAULT_UNIVERSE = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

/*
 * Scanner uses one primary decision timeframe.
 *
 * Multi-timeframe confirmation is already handled
 * internally by generateTradePlan():
 *
 * 1H  = Macro
 * 15M = Setup
 * 5M  = Confirmation
 * 1M  = Entry
 *
 * Therefore we do NOT need to generate seven
 * separate full trade plans for every symbol.
 */

const SCANNER_TIMEFRAME =
  "1h";

type ScannerInput = {
  symbols?: string[];

  accountBalance: number;
  riskPercent: number;
  leverage: number;
};

function freshnessBonus(
  status?: string
) {
  switch (status) {
    case "NEAR_ENTRY":
      return 15;

    case "FRESH":
      return 8;

    default:
      return 0;
  }
}

function qualityBonus(
  quality?: string
) {
  switch (quality) {
    case "VALID":
      return 10;

    case "WEAK":
      return 0;

    case "REJECTED":
      return -25;

    default:
      return 0;
  }
}

function rrBonus(
  rr:
    | number
    | undefined
    | null
) {
  if (
    rr === null ||
    rr === undefined ||
    !Number.isFinite(rr)
  ) {
    return 0;
  }

  /*
   * Reward healthy R:R,
   * but don't allow R:R alone
   * to dominate scanner ranking.
   */

  return Math.min(
    10,
    rr * 4
  );
}

async function scanAsset(
  symbol: string,
  accountBalance: number,
  riskPercent: number,
  leverage: number
): Promise<ScannerAssetResult> {
  try {
    /*
     * ========================================
     * 1. ONE COMPLETE TRADE PLAN
     * ========================================
     */

    const tradePlan =
      await generateTradePlan({
        symbol,

        timeframe:
          SCANNER_TIMEFRAME,

        accountBalance,
        riskPercent,
        leverage,
      });

    const {
      signal,
      setup,
      risk,
    } = tradePlan;

    /*
     * WAIT is a valid market condition.
     */

    if (
      signal.direction ===
        "WAIT" ||
      !setup
    ) {
      return {
        symbol,

        available: true,

        signal,
        setup: null,
        risk: null,

        livePrice: null,

        freshness: null,

        baseRankingScore:
          signal.confidence ??
          0,

        scannerScore: null,

        actionable: false,

        error: null,
      };
    }

    /*
     * Rejected setups must never
     * become actionable scanner picks.
     */

    if (
      signal.quality ===
      "REJECTED"
    ) {
      return {
        symbol,

        available: true,

        signal,
        setup,
        risk,

        livePrice: null,

        freshness: null,

        baseRankingScore:
          signal.confidence ??
          0,

        scannerScore: null,

        actionable: false,

        error: null,
      };
    }

    /*
     * ========================================
     * 2. LIVE PRICE
     * ========================================
     */

    const ticker =
      await getBybitTicker(
        symbol
      );

    /*
     * ========================================
     * 3. SIGNAL FRESHNESS
     * ========================================
     */

    const freshness =
      evaluateSignalFreshness({
        direction:
          setup.direction,

        timeframe:
          setup.timeframe,

        timestamp:
          setup.timestamp,

        entryPrice:
          setup.entryPrice,

        stopLossPrice:
          setup.stopLossPrice,

        takeProfit1Price:
          setup.takeProfit1Price,

        takeProfit2Price:
          setup.takeProfit2Price,

        currentPrice:
          ticker.lastPrice,
      });

    /*
     * ========================================
     * 4. BASE RANKING SCORE
     * ========================================
     *
     * Confidence remains the main factor.
     *
     * Setup quality and R:R are supporting
     * factors.
     */

    const baseRankingScore =
      (
        signal.confidence ??
        0
      ) +
      qualityBonus(
        signal.quality
      ) +
      rrBonus(
        setup.riskRewardRatioTP2
      );

    /*
     * ========================================
     * 5. FINAL SCANNER SCORE
     * ========================================
     */

    const scannerScore =
      freshness.actionable
        ? Math.min(
            100,
            baseRankingScore +
              freshnessBonus(
                freshness.status
              )
          )
        : null;

    return {
      symbol,

      available: true,

      signal,
      setup,
      risk,

      livePrice:
        ticker.lastPrice,

      freshness,

      baseRankingScore,

      scannerScore,

      actionable:
        freshness.actionable,

      error: null,
    };
  } catch (error) {
    return {
      symbol,

      available: false,

      signal: null,
      setup: null,
      risk: null,

      livePrice: null,

      freshness: null,

      baseRankingScore: null,
      scannerScore: null,

      actionable: false,

      error:
        error instanceof Error
          ? error.message
          : "Asset scan failed",
    };
  }
}

export async function scanOpportunities({
  symbols =
    DEFAULT_UNIVERSE,

  accountBalance,
  riskPercent,
  leverage,
}: ScannerInput): Promise<OpportunityScannerResult> {
  /*
   * BTC / ETH / SOL are independent,
   * therefore scan them concurrently.
   */

  const assets =
    await Promise.all(
      symbols.map(
        (symbol) =>
          scanAsset(
            symbol,
            accountBalance,
            riskPercent,
            leverage
          )
      )
    );

  /*
   * Only fresh actionable setups
   * are eligible for Best Setup.
   */

  const ranked =
    assets
      .filter(
        (asset) =>
          asset.actionable &&
          asset.scannerScore !==
            null &&
          Number.isFinite(
            asset.scannerScore
          )
      )
      .sort(
        (a, b) =>
          (
            b.scannerScore ??
            -Infinity
          ) -
          (
            a.scannerScore ??
            -Infinity
          )
      );

  return {
    timestamp:
      new Date().toISOString(),

    universe:
      symbols,

    best:
      ranked[0] ??
      null,

    assets,
  };
}