import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getBybitTicker,
} from "@/lib/market-data/bybit-ticker";

import {
  recordSignalPerformance,
} from "@/lib/trading/performance/service";

import {
  getLifecycleCandles,
} from "@/lib/trading/signal/lifecycle-candle-service";

import {
  resolveLifecycle,
  type LifecycleResolution,
} from "@/lib/trading/signal/lifecycle-resolver";

type LifecyclePhase =
  | "WAITING_ENTRY"
  | "ENTRY_TRIGGERED"
  | "TP1_HIT"
  | "TP2_HIT"
  | "STOPPED"
  | "INVALIDATED"
  | "EXPIRED";

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
  "1d": 1440,
};

function getMaxWaitingAge(
  timeframe: string
) {
  const minutes =
    TIMEFRAME_MINUTES[
      timeframe
    ] ?? 60;

  /*
   * Signal may wait roughly
   * 2.5 candles for entry.
   */

  return Math.max(
    15,
    Math.round(
      minutes * 2.5
    )
  );
}

function parseDate(
  value: unknown,
  label: string
) {
  const date =
    new Date(
      String(value)
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      `Invalid ${label}`
    );
  }

  return date;
}

async function patchSignal(
  signalId: string,
  patch: Record<
    string,
    unknown
  >
) {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "trading_signals"
      )
      .update({
        ...patch,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        signalId
      )
      .select()
      .single();

  if (error) {
    throw new Error(
      `Failed lifecycle update: ${error.message}`
    );
  }

  return data;
}

function resolveTickerPoint({
  direction,
  entryPrice,
  stopLossPrice,
  takeProfit1Price,
  takeProfit2Price,
  entryTriggered,
  tp1Hit,
  currentPrice,
  nowIso,
}: {
  direction:
    "LONG" |
    "SHORT";

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

  currentPrice:
    number;

  nowIso:
    string;
}) {
  /*
   * This is a single observed point,
   * not a historical OHLC interval.
   *
   * Deadline is intentionally null here.
   *
   * The historical resolver has already
   * determined that the signal has not
   * expired before we reach this fallback.
   */

  return resolveLifecycle({
    direction,

    entryPrice,

    stopLossPrice,

    takeProfit1Price,

    takeProfit2Price,

    entryTriggered,

    tp1Hit,

    candles: [
      {
        timestamp:
          nowIso,

        open:
          currentPrice,

        high:
          currentPrice,

        low:
          currentPrice,

        close:
          currentPrice,

        overlapsStart:
          false,
      },
    ],

    entryDeadlineTimestamp:
      null,

    observedUntilTimestamp:
      nowIso,
  });
}

function firstDefinedTimestamp(
  ...values:
    Array<
      string |
      null |
      undefined
    >
) {
  for (
    const value of
      values
  ) {
    if (value) {
      return value;
    }
  }

  return null;
}

async function monitorSignal(
  signal: any
) {
  if (
    signal.direction !==
      "LONG" &&
    signal.direction !==
      "SHORT"
  ) {
    return null;
  }

  /*
   * ========================================
   * LIVE PRICE
   * ========================================
   */

  const ticker =
    await getBybitTicker(
      signal.symbol
    );

  const currentPrice =
    Number(
      ticker.lastPrice
    );

  const entryPrice =
    Number(
      signal.entry_price
    );

  const stopLossPrice =
    Number(
      signal.stop_loss_price
    );

  const takeProfit2Price =
    Number(
      signal.take_profit_price
    );

  if (
    !Number.isFinite(
      currentPrice
    ) ||
    !Number.isFinite(
      entryPrice
    ) ||
    !Number.isFinite(
      stopLossPrice
    ) ||
    !Number.isFinite(
      takeProfit2Price
    )
  ) {
    throw new Error(
      `${signal.symbol} has invalid trade levels`
    );
  }

  const riskDistance =
    Math.abs(
      entryPrice -
        stopLossPrice
    );

  if (
    riskDistance <=
    0
  ) {
    throw new Error(
      `${signal.symbol} has invalid risk distance`
    );
  }

  /*
   * HiddenAlpha TP1 = 1R.
   * TP2 remains final DB target.
   */

  const takeProfit1Price =
    signal.direction ===
    "LONG"
      ? entryPrice +
        riskDistance
      : entryPrice -
        riskDistance;

  const now =
    new Date();

  const nowIso =
    now.toISOString();

  /*
   * ========================================
   * ENTRY EXPIRATION
   * ========================================
   */

  const publishedAt =
    parseDate(
      signal.timestamp,
      `${signal.symbol} signal timestamp`
    );

  const maxWaitingAge =
    getMaxWaitingAge(
      signal.timeframe
    );

  const entryDeadline =
    new Date(
      publishedAt.getTime() +
        maxWaitingAge *
          60_000
    );

  const entryDeadlineIso =
    entryDeadline.toISOString();

  /*
   * ========================================
   * OBSERVATION WINDOW
   * ========================================
   *
   * Normal:
   *
   * last_checked_at → now
   *
   * First lifecycle run:
   *
   * signal timestamp → now
   */

  const observationStart =
    signal.last_checked_at ??
    signal.timestamp ??
    signal.created_at;

  if (
    !observationStart
  ) {
    throw new Error(
      `${signal.symbol} has no lifecycle observation start`
    );
  }

  parseDate(
    observationStart,
    `${signal.symbol} lifecycle observation start`
  );

  /*
   * ========================================
   * 1M CANDLE REPLAY
   * ========================================
   */

  const candles =
    await getLifecycleCandles({
      symbol:
        signal.symbol,

      fromTimestamp:
        observationStart,

      toTimestamp:
        nowIso,
    });

  /*
   * The candle reader currently caps the
   * replay at 1000 rows.
   *
   * If we hit that cap AND the last returned
   * candle is still far behind current time,
   * we refuse to advance last_checked_at.
   *
   * Silent history loss would be worse than
   * keeping the signal active for recovery.
   */

  if (
    candles.length >=
    1000
  ) {
    const lastCandle =
      candles[
        candles.length -
          1
      ];

    const lastCandleTime =
      new Date(
        lastCandle.timestamp
      ).getTime();

    const gapToNowMs =
      now.getTime() -
      lastCandleTime;

    if (
      Number.isFinite(
        lastCandleTime
      ) &&
      gapToNowMs >
        2 *
          60_000
    ) {
      throw new Error(
        `${signal.symbol} lifecycle candle replay was truncated`
      );
    }
  }

  const alreadyEntered =
    Boolean(
      signal.entry_triggered_at
    );

  const alreadyTp1 =
    Boolean(
      signal.tp1_hit_at
    );

  /*
   * ========================================
   * HISTORICAL RESOLUTION
   * ========================================
   */

  const historyResolution =
    resolveLifecycle({
      direction:
        signal.direction,

      entryPrice,

      stopLossPrice,

      takeProfit1Price,

      takeProfit2Price,

      entryTriggered:
        alreadyEntered,

      tp1Hit:
        alreadyTp1,

      candles,

      entryDeadlineTimestamp:
        alreadyEntered
          ? null
          : entryDeadlineIso,

      observedUntilTimestamp:
        nowIso,
    });

  let resolution:
    LifecycleResolution =
      historyResolution;

  /*
   * ========================================
   * LIVE TICKER FALLBACK
   * ========================================
   *
   * Candle replay detects intraminute levels.
   *
   * Ticker then covers the latest point in
   * time in case stored candle data has not
   * yet reflected the newest tick.
   */

  if (
    !historyResolution.terminal
  ) {
    resolution =
      resolveTickerPoint({
        direction:
          signal.direction,

        entryPrice,

        stopLossPrice,

        takeProfit1Price,

        takeProfit2Price,

        entryTriggered:
          historyResolution.entryTriggered,

        tp1Hit:
          historyResolution.tp1Hit,

        currentPrice,

        nowIso,
      });
  }

  /*
   * ========================================
   * PRESERVE EVENT TIMES
   * ========================================
   *
   * The ticker fallback only receives state
   * booleans, so historical event timestamps
   * are explicitly preserved here.
   */

  const entryTriggeredAt =
    firstDefinedTimestamp(
      signal.entry_triggered_at,

      historyResolution
        .entryCandleTimestamp,

      resolution
        .entryCandleTimestamp,

      resolution.entryTriggered
        ? nowIso
        : null
    );

  const tp1HitAt =
    firstDefinedTimestamp(
      signal.tp1_hit_at,

      historyResolution
        .tp1CandleTimestamp,

      resolution
        .tp1CandleTimestamp,

      resolution.tp1Hit
        ? nowIso
        : null
    );

  const stopHitAt =
    firstDefinedTimestamp(
      resolution
        .stopCandleTimestamp,

      historyResolution
        .stopCandleTimestamp,

      nowIso
    );

  const tp2HitAt =
    firstDefinedTimestamp(
      resolution
        .tp2CandleTimestamp,

      historyResolution
        .tp2CandleTimestamp,

      nowIso
    );

  /*
   * ========================================
   * TERMINAL — INVALIDATED BEFORE ENTRY
   * ========================================
   */

  if (
    resolution.phase ===
    "INVALIDATED"
  ) {
    const updated =
      await patchSignal(
        signal.id,
        {
          status:
            "INVALIDATED",

          lifecycle_phase:
            "INVALIDATED",

          stop_hit_at:
            stopHitAt,

          last_price:
            currentPrice,

          last_checked_at:
            nowIso,
        }
      );

    return {
      signal:
        updated,

      phase:
        "INVALIDATED" as LifecyclePhase,

      performanceRecorded:
        false,
    };
  }

  /*
   * ========================================
   * TERMINAL — EXPIRED
   * ========================================
   */

  if (
    resolution.phase ===
    "EXPIRED"
  ) {
    const updated =
      await patchSignal(
        signal.id,
        {
          status:
            "EXPIRED",

          lifecycle_phase:
            "EXPIRED",

          expired_at:
            nowIso,

          last_price:
            currentPrice,

          last_checked_at:
            nowIso,
        }
      );

    return {
      signal:
        updated,

      phase:
        "EXPIRED" as LifecyclePhase,

      performanceRecorded:
        false,
    };
  }

  /*
   * ========================================
   * TERMINAL — STOP
   * ========================================
   */

  if (
    resolution.phase ===
    "STOPPED"
  ) {
    if (
      !entryTriggeredAt
    ) {
      throw new Error(
        `${signal.symbol} stopped without entry timestamp`
      );
    }

    const patch:
      Record<
        string,
        unknown
      > = {
        status:
          "INVALIDATED",

        lifecycle_phase:
          "STOPPED",

        entry_triggered_at:
          entryTriggeredAt,

        stop_hit_at:
          stopHitAt,

        last_price:
          currentPrice,

        last_checked_at:
          nowIso,
      };

    /*
     * If TP1 happened in an earlier candle
     * before a later stop, preserve it.
     *
     * If TP1 + STOP occurred in the SAME
     * ambiguous candle, resolver uses
     * STOP-first and tp1Hit remains false.
     */

    if (
      tp1HitAt &&
      resolution.tp1Hit
    ) {
      patch.tp1_hit_at =
        tp1HitAt;
    }

    const updated =
      await patchSignal(
        signal.id,
        patch
      );

    /*
     * Performance uses the frozen planned SL,
     * not temporary ticker slippage.
     */

    await recordSignalPerformance(
      signal.id,
      stopLossPrice
    );

    return {
      signal:
        updated,

      phase:
        "STOPPED" as LifecyclePhase,

      performanceRecorded:
        true,
    };
  }

  /*
   * ========================================
   * TERMINAL — TP2
   * ========================================
   */

  if (
    resolution.phase ===
    "TP2_HIT"
  ) {
    if (
      !entryTriggeredAt
    ) {
      throw new Error(
        `${signal.symbol} TP2 without entry timestamp`
      );
    }

    const updated =
      await patchSignal(
        signal.id,
        {
          status:
            "COMPLETED",

          lifecycle_phase:
            "TP2_HIT",

          entry_triggered_at:
            entryTriggeredAt,

          tp1_hit_at:
            tp1HitAt ??
            tp2HitAt,

          tp2_hit_at:
            tp2HitAt,

          last_price:
            currentPrice,

          last_checked_at:
            nowIso,
        }
      );

    /*
     * Performance uses exact planned TP2.
     */

    await recordSignalPerformance(
      signal.id,
      takeProfit2Price
    );

    return {
      signal:
        updated,

      phase:
        "TP2_HIT" as LifecyclePhase,

      performanceRecorded:
        true,
    };
  }

  /*
   * ========================================
   * NON-TERMINAL — TP1
   * ========================================
   */

  if (
    resolution.phase ===
    "TP1_HIT"
  ) {
    if (
      !entryTriggeredAt
    ) {
      throw new Error(
        `${signal.symbol} TP1 without entry timestamp`
      );
    }

    const updated =
      await patchSignal(
        signal.id,
        {
          lifecycle_phase:
            "TP1_HIT",

          entry_triggered_at:
            entryTriggeredAt,

          tp1_hit_at:
            tp1HitAt ??
            nowIso,

          last_price:
            currentPrice,

          last_checked_at:
            nowIso,
        }
      );

    return {
      signal:
        updated,

      phase:
        "TP1_HIT" as LifecyclePhase,

      performanceRecorded:
        false,
    };
  }

  /*
   * ========================================
   * NON-TERMINAL — ENTRY
   * ========================================
   */

  if (
    resolution.phase ===
    "ENTRY_TRIGGERED"
  ) {
    if (
      !entryTriggeredAt
    ) {
      throw new Error(
        `${signal.symbol} entry state missing timestamp`
      );
    }

    const updated =
      await patchSignal(
        signal.id,
        {
          lifecycle_phase:
            "ENTRY_TRIGGERED",

          entry_triggered_at:
            entryTriggeredAt,

          last_price:
            currentPrice,

          last_checked_at:
            nowIso,
        }
      );

    return {
      signal:
        updated,

      phase:
        "ENTRY_TRIGGERED" as LifecyclePhase,

      performanceRecorded:
        false,
    };
  }

  /*
   * ========================================
   * NON-TERMINAL — WAITING ENTRY
   * ========================================
   */

  const updated =
    await patchSignal(
      signal.id,
      {
        lifecycle_phase:
          "WAITING_ENTRY",

        last_price:
          currentPrice,

        last_checked_at:
          nowIso,
      }
    );

  return {
    signal:
      updated,

    phase:
      "WAITING_ENTRY" as LifecyclePhase,

    performanceRecorded:
      false,
  };
}

export async function monitorActiveSignals() {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "trading_signals"
      )
      .select("*")
      .eq(
        "status",
        "ACTIVE"
      )
      .in(
        "direction",
        [
          "LONG",
          "SHORT",
        ]
      )
      .order(
        "timestamp",
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw new Error(
      `Failed to load active signals: ${error.message}`
    );
  }

  const signals =
    data ?? [];

  /*
   * Each symbol can be checked independently.
   */

  const results =
    await Promise.all(
      signals.map(
        async (
          signal
        ) => {
          try {
            const result =
              await monitorSignal(
                signal
              );

            return {
              success:
                true,

              signalId:
                signal.id,

              symbol:
                signal.symbol,

              ...result,
            };
          } catch (
            error:
              unknown
          ) {
            return {
              success:
                false,

              signalId:
                signal.id,

              symbol:
                signal.symbol,

              error:
                error instanceof Error
                  ? error.message
                  : String(
                      error
                    ),
            };
          }
        }
      )
    );

  return {
    timestamp:
      new Date().toISOString(),

    activeSignalsChecked:
      signals.length,

    results,
  };
}