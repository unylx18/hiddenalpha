import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  TradingSignal,
} from "@/lib/trading/signal/types";

/*
 * ========================================
 * SAVE SIGNAL
 * ========================================
 */

export async function saveTradingSignal(
  signal: TradingSignal
) {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("trading_signals")
    .insert({
      symbol:
        signal.symbol,

      timeframe:
        signal.timeframe,

      timestamp:
        signal.timestamp,

      direction:
        signal.direction,

      summary:
        signal.summary,

      confidence:
        signal.confidence,

      confidence_level:
        signal.confidenceLevel,

      quality:
        signal.quality,

      status:
        signal.status,

      reasons:
        signal.reasons,

      invalidation:
        signal.invalidation,

      entry_price:
        signal.entryPrice ??
        null,

      stop_loss_price:
        signal.stopLossPrice ??
        null,

      /*
       * Current DB schema stores
       * the final target here.
       *
       * HiddenAlpha currently treats
       * TP2 as final completion target.
       */
      take_profit_price:
        signal.takeProfit2Price ??
        signal.takeProfitPrice ??
        null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to save trading signal: ${error.message}`
    );
  }

  return data;
}

/*
 * ========================================
 * ACTIVE SIGNAL FOR SYMBOL
 * ========================================
 */

export async function getActiveTradingSignalForSymbol(
  symbol: string
) {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("trading_signals")
    .select("*")
    .eq(
      "symbol",
      symbol
    )
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
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch active signal: ${error.message}`
    );
  }

  return data;
}

/*
 * ========================================
 * LATEST ACTIVE SIGNAL
 * ========================================
 *
 * Used by Overview later.
 */

export async function getLatestActiveTradingSignal() {
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
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch latest active signal: ${error.message}`
    );
  }

  return data;
}

/*
 * ========================================
 * ALL ACTIVE SIGNALS
 * ========================================
 *
 * Lifecycle monitor will use this
 * in the next step.
 */

export async function getActiveTradingSignals() {
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
        ascending: false,
      }
    );

  if (error) {
    throw new Error(
      `Failed to fetch active signals: ${error.message}`
    );
  }

  return data ?? [];
}

/*
 * ========================================
 * UPDATE STATUS
 * ========================================
 */

export async function updateTradingSignalStatus(
  signalId: string,

  status:
    | "ACTIVE"
    | "INVALIDATED"
    | "EXPIRED"
    | "COMPLETED"
) {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("trading_signals")
    .update({
      status,

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
      `Failed to update trading signal status: ${error.message}`
    );
  }

  return data;
}

/*
 * ========================================
 * GET BY ID
 * ========================================
 */

export async function getTradingSignalById(
  signalId: string
) {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("trading_signals")
    .select("*")
    .eq(
      "id",
      signalId
    )
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch trading signal: ${error.message}`
    );
  }

  return data;
}