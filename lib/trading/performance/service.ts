import { getTradingSignalById } from "@/lib/trading/signal/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateRealizedR } from "@/lib/trading/performance/calculator";

export async function recordSignalPerformance(
  signalId: string,
  exitPrice: number
) {
  if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
    throw new Error("Exit price must be a valid positive number");
  }

  const signal = await getTradingSignalById(signalId);

  if (signal.direction !== "LONG" && signal.direction !== "SHORT") {
    throw new Error("Performance requires a LONG or SHORT signal");
  }

  if (signal.status !== "COMPLETED" && signal.status !== "INVALIDATED") {
    throw new Error(
      "Signal must be COMPLETED or INVALIDATED before recording performance"
    );
  }

  if (signal.result !== null || signal.closed_at !== null) {
    throw new Error("Signal performance has already been recorded");
  }

  const entryPrice = Number(signal.entry_price);
  const stopLossPrice = Number(signal.stop_loss_price);

  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopLossPrice) ||
    entryPrice <= 0 ||
    stopLossPrice <= 0
  ) {
    throw new Error("Signal does not contain valid trade levels");
  }

  const performance = calculateRealizedR(
    signal.direction,
    entryPrice,
    stopLossPrice,
    exitPrice
  );

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("trading_signals")
    .update({
      result: performance.result,
      realized_r_multiple: performance.realizedRMultiple,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", signalId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Failed to record signal performance: ${error.message}`
    );
  }

  return data;
}