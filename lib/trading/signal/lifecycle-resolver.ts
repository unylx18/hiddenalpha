import type {
  LifecycleCandle,
} from "@/lib/trading/signal/lifecycle-candle-service";

export type LifecycleDirection =
  | "LONG"
  | "SHORT";

export type LifecycleResolutionPhase =
  | "WAITING_ENTRY"
  | "ENTRY_TRIGGERED"
  | "TP1_HIT"
  | "TP2_HIT"
  | "STOPPED"
  | "INVALIDATED"
  | "EXPIRED";

export type LifecycleResolutionReason =
  | "NO_EVENT"
  | "ENTRY"
  | "TP1"
  | "TP2"
  | "STOP"
  | "PRE_ENTRY_STOP"
  | "EXPIRED";

export type LifecycleResolverInput = {
  direction:
    LifecycleDirection;

  entryPrice:
    number;

  stopLossPrice:
    number;

  takeProfit1Price:
    number;

  takeProfit2Price:
    number;

  entryTriggered:
    boolean;

  tp1Hit:
    boolean;

  candles:
    LifecycleCandle[];

  /*
   * Optional deadline for signals that
   * are still waiting for entry.
   *
   * Once entry has already triggered,
   * this deadline is ignored.
   */
  entryDeadlineTimestamp?:
    string | null;

  /*
   * End of the observation window.
   *
   * Used to decide whether a setup has
   * expired after replaying candles.
   */
  observedUntilTimestamp:
    string;
};

export type LifecycleResolution = {
  phase:
    LifecycleResolutionPhase;

  reason:
    LifecycleResolutionReason;

  terminal:
    boolean;

  entryTriggered:
    boolean;

  tp1Hit:
    boolean;

  entryCandleTimestamp:
    string | null;

  tp1CandleTimestamp:
    string | null;

  tp2CandleTimestamp:
    string | null;

  stopCandleTimestamp:
    string | null;

  eventCandleTimestamp:
    string | null;

  /*
   * True when OHLC cannot tell us which
   * level was touched first and the
   * conservative STOP-first rule was used.
   */
  ambiguousCandle:
    boolean;

  processedCandles:
    number;

  partialCandles:
    number;
};

function parseTimestamp(
  timestamp: string,
  label: string
) {
  const value =
    new Date(
      timestamp
    ).getTime();

  if (
    !Number.isFinite(
      value
    )
  ) {
    throw new Error(
      `Invalid ${label}: ${timestamp}`
    );
  }

  return value;
}

function validateLevels({
  direction,
  entryPrice,
  stopLossPrice,
  takeProfit1Price,
  takeProfit2Price,
}: Pick<
  LifecycleResolverInput,
  | "direction"
  | "entryPrice"
  | "stopLossPrice"
  | "takeProfit1Price"
  | "takeProfit2Price"
>) {
  const levels = [
    entryPrice,
    stopLossPrice,
    takeProfit1Price,
    takeProfit2Price,
  ];

  if (
    levels.some(
      (value) =>
        !Number.isFinite(
          value
        )
    )
  ) {
    throw new Error(
      "Lifecycle resolver received invalid trade levels"
    );
  }

  if (
    direction ===
    "LONG"
  ) {
    if (
      !(
        stopLossPrice <
          entryPrice &&
        entryPrice <
          takeProfit1Price &&
        takeProfit1Price <
          takeProfit2Price
      )
    ) {
      throw new Error(
        "Invalid LONG lifecycle level geometry"
      );
    }

    return;
  }

  if (
    !(
      stopLossPrice >
        entryPrice &&
      entryPrice >
        takeProfit1Price &&
      takeProfit1Price >
        takeProfit2Price
    )
  ) {
    throw new Error(
      "Invalid SHORT lifecycle level geometry"
    );
  }
}

function touchedEntry(
  direction:
    LifecycleDirection,
  high: number,
  low: number,
  entryPrice: number
) {
  return direction ===
    "LONG"
    ? high >=
        entryPrice
    : low <=
        entryPrice;
}

function touchedStop(
  direction:
    LifecycleDirection,
  high: number,
  low: number,
  stopLossPrice: number
) {
  return direction ===
    "LONG"
    ? low <=
        stopLossPrice
    : high >=
        stopLossPrice;
}

function touchedTp1(
  direction:
    LifecycleDirection,
  high: number,
  low: number,
  takeProfit1Price: number
) {
  return direction ===
    "LONG"
    ? high >=
        takeProfit1Price
    : low <=
        takeProfit1Price;
}

function touchedTp2(
  direction:
    LifecycleDirection,
  high: number,
  low: number,
  takeProfit2Price: number
) {
  return direction ===
    "LONG"
    ? high >=
        takeProfit2Price
    : low <=
        takeProfit2Price;
}

export function resolveLifecycle(
  input:
    LifecycleResolverInput
): LifecycleResolution {
  const {
    direction,
    entryPrice,
    stopLossPrice,
    takeProfit1Price,
    takeProfit2Price,
    candles,
    observedUntilTimestamp,
  } = input;

  validateLevels({
    direction,
    entryPrice,
    stopLossPrice,
    takeProfit1Price,
    takeProfit2Price,
  });

  if (
    input.tp1Hit &&
    !input.entryTriggered
  ) {
    throw new Error(
      "TP1 cannot be hit before entry is triggered"
    );
  }

  const observedUntilMs =
    parseTimestamp(
      observedUntilTimestamp,
      "lifecycle observation timestamp"
    );

  const entryDeadlineMs =
    input.entryDeadlineTimestamp
      ? parseTimestamp(
          input.entryDeadlineTimestamp,
          "entry deadline"
        )
      : null;

  const orderedCandles =
    [...candles].sort(
      (
        first,
        second
      ) =>
        parseTimestamp(
          first.timestamp,
          "candle timestamp"
        ) -
        parseTimestamp(
          second.timestamp,
          "candle timestamp"
        )
    );

  let entryTriggered =
    input.entryTriggered;

  let tp1Hit =
    input.tp1Hit;

  let phase:
    LifecycleResolutionPhase =
      tp1Hit
        ? "TP1_HIT"
        : entryTriggered
        ? "ENTRY_TRIGGERED"
        : "WAITING_ENTRY";

  let reason:
    LifecycleResolutionReason =
      "NO_EVENT";

  let entryCandleTimestamp:
    string | null =
    null;

  let tp1CandleTimestamp:
    string | null =
    null;

  let tp2CandleTimestamp:
    string | null =
    null;

  let stopCandleTimestamp:
    string | null =
    null;

  let eventCandleTimestamp:
    string | null =
    null;

  let ambiguousCandle =
    false;

  let processedCandles =
    0;

  let partialCandles =
    0;

  for (
    const candle of
      orderedCandles
  ) {
    const candleTimestampMs =
      parseTimestamp(
        candle.timestamp,
        "candle timestamp"
      );

    if (
      candleTimestampMs >
      observedUntilMs
    ) {
      break;
    }

    /*
     * ========================================
     * ENTRY DEADLINE
     * ========================================
     *
     * For a setup still waiting for entry,
     * do not accept a candle whose full
     * minute extends beyond the deadline.
     *
     * This prevents a late entry from being
     * counted as valid simply because its
     * candle started before expiration.
     */

    if (
      !entryTriggered &&
      entryDeadlineMs !==
        null
    ) {
      const candleEndMs =
        candleTimestampMs +
        60_000;

      if (
        candleEndMs >
        entryDeadlineMs
      ) {
        break;
      }
    }

    processedCandles +=
      1;

    /*
     * ========================================
     * PARTIAL FIRST CANDLE
     * ========================================
     *
     * Its historical HIGH/LOW may include
     * movement that happened before
     * last_checked_at.
     *
     * Therefore:
     *
     * - do NOT trust full high/low
     * - use close as a single observed point
     *
     * If close itself crossed a level,
     * that post-check observation is valid.
     */

    const observationHigh =
      candle.overlapsStart
        ? candle.close
        : candle.high;

    const observationLow =
      candle.overlapsStart
        ? candle.close
        : candle.low;

    if (
      candle.overlapsStart
    ) {
      partialCandles +=
        1;
    }

    const entryHit =
      touchedEntry(
        direction,
        observationHigh,
        observationLow,
        entryPrice
      );

    const stopHit =
      touchedStop(
        direction,
        observationHigh,
        observationLow,
        stopLossPrice
      );

    const tp1Touched =
      touchedTp1(
        direction,
        observationHigh,
        observationLow,
        takeProfit1Price
      );

    const tp2Touched =
      touchedTp2(
        direction,
        observationHigh,
        observationLow,
        takeProfit2Price
      );

    /*
     * ========================================
     * BEFORE ENTRY
     * ========================================
     */

    if (
      !entryTriggered
    ) {
      /*
       * Stop touched without entry.
       *
       * Setup invalidated before trade
       * activation. This is NOT a loss.
       */

      if (
        stopHit &&
        !entryHit
      ) {
        return {
          phase:
            "INVALIDATED",

          reason:
            "PRE_ENTRY_STOP",

          terminal:
            true,

          entryTriggered:
            false,

          tp1Hit:
            false,

          entryCandleTimestamp:
            null,

          tp1CandleTimestamp:
            null,

          tp2CandleTimestamp:
            null,

          stopCandleTimestamp:
            candle.timestamp,

          eventCandleTimestamp:
            candle.timestamp,

          ambiguousCandle:
            false,

          processedCandles,

          partialCandles,
        };
      }

      if (
        !entryHit
      ) {
        continue;
      }

      /*
       * Entry has now been touched.
       */

      entryTriggered =
        true;

      entryCandleTimestamp =
        candle.timestamp;

      phase =
        "ENTRY_TRIGGERED";

      reason =
        "ENTRY";

      eventCandleTimestamp =
        candle.timestamp;

      /*
       * Same candle touched ENTRY + STOP.
       *
       * OHLC cannot tell which happened
       * first.
       *
       * Conservative execution assumption:
       *
       * ENTRY → STOP
       *
       * Therefore this becomes a loss,
       * rather than assuming stop happened
       * before entry and ignoring the trade.
       */

      if (
        stopHit
      ) {
        return {
          phase:
            "STOPPED",

          reason:
            "STOP",

          terminal:
            true,

          entryTriggered:
            true,

          tp1Hit:
            false,

          entryCandleTimestamp,

          tp1CandleTimestamp:
            null,

          tp2CandleTimestamp:
            null,

          stopCandleTimestamp:
            candle.timestamp,

          eventCandleTimestamp:
            candle.timestamp,

          ambiguousCandle:
            true,

          processedCandles,

          partialCandles,
        };
      }

      /*
       * Entry and TP levels may also have
       * happened inside one fast candle.
       */

      if (
        tp2Touched
      ) {
        return {
          phase:
            "TP2_HIT",

          reason:
            "TP2",

          terminal:
            true,

          entryTriggered:
            true,

          tp1Hit:
            true,

          entryCandleTimestamp,

          tp1CandleTimestamp:
            candle.timestamp,

          tp2CandleTimestamp:
            candle.timestamp,

          stopCandleTimestamp:
            null,

          eventCandleTimestamp:
            candle.timestamp,

          ambiguousCandle:
            false,

          processedCandles,

          partialCandles,
        };
      }

      if (
        tp1Touched
      ) {
        tp1Hit =
          true;

        phase =
          "TP1_HIT";

        reason =
          "TP1";

        tp1CandleTimestamp =
          candle.timestamp;

        eventCandleTimestamp =
          candle.timestamp;
      }

      continue;
    }

    /*
     * ========================================
     * AFTER ENTRY
     * ========================================
     *
     * STOP is checked before targets.
     *
     * If one candle contains both STOP and
     * TP, intrabar order is unknowable from
     * OHLC.
     *
     * HiddenAlpha chooses the conservative
     * STOP-first resolution.
     */

    if (
      stopHit
    ) {
      const conflictingTarget =
        tp1Touched ||
        tp2Touched;

      return {
        phase:
          "STOPPED",

        reason:
          "STOP",

        terminal:
          true,

        entryTriggered:
          true,

        tp1Hit,

        entryCandleTimestamp,

        tp1CandleTimestamp,

        tp2CandleTimestamp:
          null,

        stopCandleTimestamp:
          candle.timestamp,

        eventCandleTimestamp:
          candle.timestamp,

        ambiguousCandle:
          conflictingTarget,

        processedCandles,

        partialCandles,
      };
    }

    /*
     * TP2 implies TP1 was also crossed.
     */

    if (
      tp2Touched
    ) {
      return {
        phase:
          "TP2_HIT",

        reason:
          "TP2",

        terminal:
          true,

        entryTriggered:
          true,

        tp1Hit:
          true,

        entryCandleTimestamp,

        tp1CandleTimestamp:
          tp1CandleTimestamp ??
          candle.timestamp,

        tp2CandleTimestamp:
          candle.timestamp,

        stopCandleTimestamp:
          null,

        eventCandleTimestamp:
          candle.timestamp,

        ambiguousCandle:
          false,

        processedCandles,

        partialCandles,
      };
    }

    if (
      !tp1Hit &&
      tp1Touched
    ) {
      tp1Hit =
        true;

      phase =
        "TP1_HIT";

      reason =
        "TP1";

      tp1CandleTimestamp =
        candle.timestamp;

      eventCandleTimestamp =
        candle.timestamp;
    }
  }

  /*
   * ========================================
   * EXPIRATION
   * ========================================
   *
   * Only relevant if trade never entered.
   */

  if (
    !entryTriggered &&
    entryDeadlineMs !==
      null &&
    observedUntilMs >
      entryDeadlineMs
  ) {
    return {
      phase:
        "EXPIRED",

      reason:
        "EXPIRED",

      terminal:
        true,

      entryTriggered:
        false,

      tp1Hit:
        false,

      entryCandleTimestamp:
        null,

      tp1CandleTimestamp:
        null,

      tp2CandleTimestamp:
        null,

      stopCandleTimestamp:
        null,

      eventCandleTimestamp:
        null,

      ambiguousCandle:
        false,

      processedCandles,

      partialCandles,
    };
  }

  return {
    phase,

    reason,

    terminal:
      false,

    entryTriggered,

    tp1Hit,

    entryCandleTimestamp,

    tp1CandleTimestamp,

    tp2CandleTimestamp,

    stopCandleTimestamp,

    eventCandleTimestamp,

    ambiguousCandle,

    processedCandles,

    partialCandles,
  };
}