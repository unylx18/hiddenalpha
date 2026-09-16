import {
  SignalFreshnessInput,
  SignalFreshnessResult,
} from "@/lib/trading/freshness/types";

const TIMEFRAME_MINUTES: Record<
  string,
  number
> = {
  "1m": 1,
  "3m": 3,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "2h": 120,
  "4h": 240,
  "6h": 360,
  "12h": 720,
  "1d": 1440,
};

function getMaxAgeMinutes(
  timeframe: string
) {
  const timeframeMinutes =
    TIMEFRAME_MINUTES[
      timeframe
    ] ?? 60;

  /*
   * Minimum 15 minutes.
   *
   * Higher timeframes are allowed
   * roughly 2.5 completed candles
   * before being considered stale.
   */

  return Math.max(
    15,
    Math.round(
      timeframeMinutes * 2.5
    )
  );
}

export function evaluateSignalFreshness(
  input: SignalFreshnessInput
): SignalFreshnessResult {
  const {
    direction,
    timeframe,
    timestamp,
    entryPrice,
    stopLossPrice,
    takeProfit1Price,
    takeProfit2Price,
    currentPrice,
  } = input;

  const values = [
    entryPrice,
    stopLossPrice,
    takeProfit1Price,
    takeProfit2Price,
    currentPrice,
  ];

  if (
    values.some(
      (value) =>
        !Number.isFinite(value) ||
        value <= 0
    )
  ) {
    throw new Error(
      "Freshness evaluator received invalid trade levels"
    );
  }

  const stopDistance =
    Math.abs(
      entryPrice -
        stopLossPrice
    );

  if (
    stopDistance <= 0
  ) {
    throw new Error(
      "Stop distance must be greater than 0"
    );
  }

  const timestampMs =
    new Date(
      timestamp
    ).getTime();

  const rawAgeMinutes =
    Number.isFinite(
      timestampMs
    )
      ? (
          Date.now() -
          timestampMs
        ) /
        60000
      : 0;

  const ageMinutes =
    Math.max(
      0,
      rawAgeMinutes
    );

  const maxAgeMinutes =
    getMaxAgeMinutes(
      timeframe
    );

  const directionalMove =
    direction === "LONG"
      ? currentPrice -
        entryPrice
      : entryPrice -
        currentPrice;

  const progressR =
    directionalMove /
    stopDistance;

  const distanceR =
    Math.abs(
      directionalMove
    ) /
    stopDistance;

  const distanceFromEntryPercent =
    (
      Math.abs(
        currentPrice -
          entryPrice
      ) /
      entryPrice
    ) *
    100;

  /*
   * ========================================
   * 1. INVALIDATION
   * ========================================
   */

  const invalidated =
    direction === "LONG"
      ? currentPrice <=
        stopLossPrice
      : currentPrice >=
        stopLossPrice;

  if (invalidated) {
    return {
      status:
        "INVALIDATED",

      actionable: false,

      currentPrice,
      entryPrice,

      distanceFromEntryPercent,
      progressR,

      ageMinutes,
      maxAgeMinutes,

      reason:
        "Current price has crossed the stop-loss / invalidation level",
    };
  }

  /*
   * ========================================
   * 2. TP2
   * ========================================
   */

  const tp2Hit =
    direction === "LONG"
      ? currentPrice >=
        takeProfit2Price
      : currentPrice <=
        takeProfit2Price;

  if (tp2Hit) {
    return {
      status:
        "TP2_HIT",

      actionable: false,

      currentPrice,
      entryPrice,

      distanceFromEntryPercent,
      progressR,

      ageMinutes,
      maxAgeMinutes,

      reason:
        "Take Profit 2 has already been reached",
    };
  }

  /*
   * ========================================
   * 3. TP1
   * ========================================
   */

  const tp1Hit =
    direction === "LONG"
      ? currentPrice >=
        takeProfit1Price
      : currentPrice <=
        takeProfit1Price;

  if (tp1Hit) {
    return {
      status:
        "TP1_HIT",

      actionable: false,

      currentPrice,
      entryPrice,

      distanceFromEntryPercent,
      progressR,

      ageMinutes,
      maxAgeMinutes,

      reason:
        "Take Profit 1 has already been reached; do not chase the original entry",
    };
  }

  /*
   * ========================================
   * 4. SIGNAL AGE
   * ========================================
   */

  if (
    ageMinutes >
    maxAgeMinutes
  ) {
    return {
      status:
        "STALE",

      actionable: false,

      currentPrice,
      entryPrice,

      distanceFromEntryPercent,
      progressR,

      ageMinutes,
      maxAgeMinutes,

      reason:
        `Signal is ${Math.round(
          ageMinutes
        )} minutes old and exceeded its freshness window`,
    };
  }

  /*
   * ========================================
   * 5. ENTRY RELEVANCE
   * ========================================
   *
   * 0.15R:
   * very close to intended entry.
   *
   * 0.35R:
   * maximum movement before
   * setup is considered extended.
   */

  if (
    distanceR <= 0.15
  ) {
    return {
      status:
        "NEAR_ENTRY",

      actionable: true,

      currentPrice,
      entryPrice,

      distanceFromEntryPercent,
      progressR,

      ageMinutes,
      maxAgeMinutes,

      reason:
        "Current price remains very close to the planned entry",
    };
  }

  if (
    distanceR >= 0.35
  ) {
    return {
      status:
        "EXTENDED",

      actionable: false,

      currentPrice,
      entryPrice,

      distanceFromEntryPercent,
      progressR,

      ageMinutes,
      maxAgeMinutes,

      reason:
        "Price has moved too far from the original entry; waiting for a new setup is safer than chasing",
    };
  }

  /*
   * ========================================
   * 6. FRESH
   * ========================================
   */

  return {
    status:
      "FRESH",

    actionable: true,

    currentPrice,
    entryPrice,

    distanceFromEntryPercent,
    progressR,

    ageMinutes,
    maxAgeMinutes,

    reason:
      "Signal remains fresh and the current price is still within an acceptable distance from entry",
  };
}