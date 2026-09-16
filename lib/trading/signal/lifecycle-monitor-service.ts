
import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getBybitTicker,
} from "@/lib/market-data/bybit-ticker";

import {
  recordSignalPerformance,
} from "@/lib/trading/performance/service";

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
  } = await supabase
    .from("trading_signals")
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
    riskDistance <= 0
  ) {
    throw new Error(
      `${signal.symbol} has invalid risk distance`
    );
  }

  /*
   * HiddenAlpha TP1 = 1R.
   * TP2 remains the final DB target.
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

  const publishedAt =
    new Date(
      signal.timestamp
    );

  const ageMinutes =
    Math.max(
      0,
      (
        now.getTime() -
        publishedAt.getTime()
      ) /
        60000
    );

  const maxWaitingAge =
    getMaxWaitingAge(
      signal.timeframe
    );

  let entryTriggered =
    Boolean(
      signal.entry_triggered_at
    );

  /*
   * ========================================
   * PRICE CONDITIONS
   * ========================================
   */

  const entryHit =
    signal.direction ===
    "LONG"
      ? currentPrice >=
        entryPrice
      : currentPrice <=
        entryPrice;

  const stopHit =
    signal.direction ===
    "LONG"
      ? currentPrice <=
        stopLossPrice
      : currentPrice >=
        stopLossPrice;

  const tp1Hit =
    signal.direction ===
    "LONG"
      ? currentPrice >=
        takeProfit1Price
      : currentPrice <=
        takeProfit1Price;

  const tp2Hit =
    signal.direction ===
    "LONG"
      ? currentPrice >=
        takeProfit2Price
      : currentPrice <=
        takeProfit2Price;

  /*
   * ========================================
   * BEFORE ENTRY
   * ========================================
   */

  if (!entryTriggered) {
    /*
     * Setup invalid before trade entry.
     *
     * This must NOT become a performance loss.
     */

    if (stopHit) {
      const updated =
        await patchSignal(
          signal.id,
          {
            status:
              "INVALIDATED",

            lifecycle_phase:
              "INVALIDATED",

            stop_hit_at:
              nowIso,

            last_price:
              currentPrice,

            last_checked_at:
              nowIso,
          }
        );

      return {
        signal: updated,

        phase:
          "INVALIDATED" as LifecyclePhase,

        performanceRecorded:
          false,
      };
    }

    /*
     * Setup never triggered within its
     * allowed waiting window.
     */

    if (
      ageMinutes >
      maxWaitingAge
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
        signal: updated,

        phase:
          "EXPIRED" as LifecyclePhase,

        performanceRecorded:
          false,
      };
    }

    /*
     * Still waiting for price to reach
     * the frozen entry.
     */

    if (!entryHit) {
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
        signal: updated,

        phase:
          "WAITING_ENTRY" as LifecyclePhase,

        performanceRecorded:
          false,
      };
    }

    /*
     * Entry is now triggered.
     */

    entryTriggered =
      true;
  }

  const entryTriggeredAt =
    signal.entry_triggered_at ??
    nowIso;

  /*
   * ========================================
   * AFTER ENTRY — STOP LOSS
   * ========================================
   */

  if (stopHit) {
    const updated =
      await patchSignal(
        signal.id,
        {
          status:
            "INVALIDATED",

          lifecycle_phase:
            "STOPPED",

          entry_triggered_at:
            entryTriggeredAt,

          stop_hit_at:
            nowIso,

          last_price:
            currentPrice,

          last_checked_at:
            nowIso,
        }
      );

    /*
     * Record exactly the planned SL,
     * not temporary ticker slippage.
     */

    await recordSignalPerformance(
      signal.id,
      stopLossPrice
    );

    return {
      signal: updated,

      phase:
        "STOPPED" as LifecyclePhase,

      performanceRecorded:
        true,
    };
  }

  /*
   * ========================================
   * AFTER ENTRY — TP2
   * ========================================
   */

  if (tp2Hit) {
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
            signal.tp1_hit_at ??
            nowIso,

          tp2_hit_at:
            nowIso,

          last_price:
            currentPrice,

          last_checked_at:
            nowIso,
        }
      );

    /*
     * Record exactly planned TP2.
     */

    await recordSignalPerformance(
      signal.id,
      takeProfit2Price
    );

    return {
      signal: updated,

      phase:
        "TP2_HIT" as LifecyclePhase,

      performanceRecorded:
        true,
    };
  }

  /*
   * ========================================
   * AFTER ENTRY — TP1
   * ========================================
   */

  if (
    tp1Hit ||
    signal.tp1_hit_at
  ) {
    const updated =
      await patchSignal(
        signal.id,
        {
          lifecycle_phase:
            "TP1_HIT",

          entry_triggered_at:
            entryTriggeredAt,

          tp1_hit_at:
            signal.tp1_hit_at ??
            nowIso,

          last_price:
            currentPrice,

          last_checked_at:
            nowIso,
        }
      );

    return {
      signal: updated,

      phase:
        "TP1_HIT" as LifecyclePhase,

      performanceRecorded:
        false,
    };
  }

  /*
   * ========================================
   * ACTIVE TRADE
   * ========================================
   */

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
    signal: updated,

    phase:
      "ENTRY_TRIGGERED" as LifecyclePhase,

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
  } = await supabase
    .from("trading_signals")
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
        ascending: true,
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
              success: true,

              signalId:
                signal.id,

              symbol:
                signal.symbol,

              ...result,
            };
          } catch (error) {
            return {
              success: false,

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