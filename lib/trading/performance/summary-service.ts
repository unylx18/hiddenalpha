import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculatePerformanceSummary,
  PerformanceRecord,
  PerformanceSummary,
} from "@/lib/trading/performance/summary-calculator";

export async function getPerformanceSummary(
  symbol?: string,
  timeframe?: string
): Promise<PerformanceSummary> {
  const supabase = createAdminClient();

  let query = supabase
    .from("trading_signals")
    .select("result, realized_r_multiple")
    .not("result", "is", null)
    .not("realized_r_multiple", "is", null);

  if (symbol) {
    query = query.eq("symbol", symbol);
  }

  if (timeframe) {
    query = query.eq("timeframe", timeframe);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Failed to fetch performance data: ${error.message}`
    );
  }

  const records: PerformanceRecord[] = (data ?? []).map((row) => ({
    result: row.result as PerformanceRecord["result"],
    realizedRMultiple: Number(row.realized_r_multiple),
  }));

  return calculatePerformanceSummary(records);
}