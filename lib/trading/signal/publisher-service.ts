import {
  scanOpportunities,
} from "@/lib/trading/scanner/service";

import {
  getActiveTradingSignalForSymbol,
  saveTradingSignal,
} from "@/lib/trading/signal/repository";

import type {
  TradingSignal,
} from "@/lib/trading/signal/types";

const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

/*
 * ========================================
 * SIGNAL QUALITY GATE V1
 * ========================================
 */

const MIN_CONFIDENCE = 55;

const MIN_SCANNER_SCORE = 75;

const MIN_RR = 1.5;

type PublisherInput = {
  symbols?: string[];

  accountBalance: number;

  riskPercent: number;

  leverage: number;
};

export async function publishBestOpportunity({
  symbols =
    DEFAULT_SYMBOLS,

  accountBalance,
  riskPercent,
  leverage,
}: PublisherInput) {
  /*
   * ========================================
   * 1. SCAN MARKET
   * ========================================
   */

  const scanner =
    await scanOpportunities({
      symbols,

      accountBalance,

      riskPercent,

      leverage,
    });

  const candidate =
    scanner.best;

  /*
   * Scanner did not find an actionable
   * candidate.
   */

  if (
    !candidate ||
    !candidate.signal ||
    !candidate.setup ||
    !candidate.freshness
  ) {
    return {
      published: false,

      reason:
        "NO_ACTIONABLE_OPPORTUNITY",

      activeSignal:
        null,

      candidate:
        null,

      scanner,
    };
  }

  const {
    signal,
    setup,
    freshness,
  } = candidate;

  /*
   * ========================================
   * 2. QUALITY GATE
   * ========================================
   */

  if (
    signal.direction !==
      "LONG" &&
    signal.direction !==
      "SHORT"
  ) {
    return {
      published: false,

      reason:
        "INVALID_DIRECTION",

      activeSignal:
        null,

      candidate,

      scanner,
    };
  }

  if (
    signal.quality !==
    "VALID"
  ) {
    return {
      published: false,

      reason:
        "QUALITY_GATE_REJECTED",

      activeSignal:
        null,

      candidate,

      scanner,
    };
  }

  if (
    signal.confidence <
    MIN_CONFIDENCE
  ) {
    return {
      published: false,

      reason:
        "CONFIDENCE_TOO_LOW",

      activeSignal:
        null,

      candidate,

      scanner,
    };
  }

  if (
    (
      candidate.scannerScore ??
      0
    ) <
    MIN_SCANNER_SCORE
  ) {
    return {
      published: false,

      reason:
        "SCANNER_SCORE_TOO_LOW",

      activeSignal:
        null,

      candidate,

      scanner,
    };
  }

  if (
    setup.riskRewardRatioTP2 <
    MIN_RR
  ) {
    return {
      published: false,

      reason:
        "RISK_REWARD_TOO_LOW",

      activeSignal:
        null,

      candidate,

      scanner,
    };
  }

  if (
    !freshness.actionable ||
    (
      freshness.status !==
        "FRESH" &&
      freshness.status !==
        "NEAR_ENTRY"
    )
  ) {
    return {
      published: false,

      reason:
        "SIGNAL_NOT_FRESH",

      activeSignal:
        null,

      candidate,

      scanner,
    };
  }

  /*
   * ========================================
   * 3. ANTI DUPLICATE
   * ========================================
   *
   * Do not publish a second signal for
   * the same asset while the previous
   * signal is still ACTIVE.
   */

  const existing =
    await getActiveTradingSignalForSymbol(
      candidate.symbol
    );

  if (existing) {
    return {
      published: false,

      reason:
        "ACTIVE_SIGNAL_EXISTS",

      activeSignal:
        existing,

      candidate,

      scanner,
    };
  }

  /*
   * ========================================
   * 4. FREEZE SIGNAL
   * ========================================
   *
   * Once this object is saved, these
   * levels become immutable trade-plan
   * levels.
   *
   * Future scanner recalculations must
   * NOT silently replace them.
   */

  const publishedSignal: TradingSignal =
    {
      ...signal,

      symbol:
        candidate.symbol,

      timeframe:
        setup.timeframe,

      timestamp:
        new Date().toISOString(),

      status:
        "ACTIVE",

      entryPrice:
        setup.entryPrice,

      stopLossPrice:
        setup.stopLossPrice,

      takeProfitPrice:
        setup.takeProfit2Price,

      takeProfit1Price:
        setup.takeProfit1Price,

      takeProfit2Price:
        setup.takeProfit2Price,

      riskRewardRatioTP1:
        setup.riskRewardRatioTP1,

      riskRewardRatioTP2:
        setup.riskRewardRatioTP2,
    };

  /*
   * ========================================
   * 5. PERSIST
   * ========================================
   */

  const savedSignal =
    await saveTradingSignal(
      publishedSignal
    );

  return {
    published: true,

    reason:
      "SIGNAL_PUBLISHED",

    activeSignal:
      savedSignal,

    candidate,

    scanner,
  };
}