import { createAdminClient } from "@/lib/supabase/admin";
import { TradingSignal } from "@/lib/trading/signal/types";

export async function saveTradingSignal(
  signal: TradingSignal
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("trading_signals")
    .insert({
      symbol: signal.symbol,
      timeframe: signal.timeframe,
      timestamp: signal.timestamp,
      direction: signal.direction,
      summary: signal.summary,
      confidence: signal.confidence,
      confidence_level: signal.confidenceLevel,
      quality: signal.quality,
      status: signal.status,
      reasons: signal.reasons,
      invalidation: signal.invalidation,
      entry_price: signal.entryPrice ?? null,
      stop_loss_price:
        signal.stopLossPrice ?? null,
      take_profit_price:
        signal.takeProfitPrice ?? null,
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

export async function updateTradingSignalStatus(
  signalId: string,
  status:
    | "ACTIVE"
    | "INVALIDATED"
    | "EXPIRED"
    | "COMPLETED"
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("trading_signals")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", signalId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to update trading signal status: ${error.message}`
    );
  }

  return data;
}

export async function getTradingSignalById(
  signalId: string
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("trading_signals")
    .select("*")
    .eq("id", signalId)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch trading signal: ${error.message}`
    );
  }

  return data;
}