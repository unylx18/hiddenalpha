/**
 * Bybit OHLC timestamps represent candle OPEN times, not completion times.
 * Avoid blindly discarding the newest candle: it may already be closed.
 * Inputs are sorted newest first, as requested from Supabase.
 */
const TIMEFRAME_MS: Record<string, number> = {
  "1m": 60_000, "3m": 180_000, "5m": 300_000,
  "15m": 900_000, "30m": 1_800_000,
  "1h": 3_600_000, "2h": 7_200_000,
  "4h": 14_400_000, "6h": 21_600_000,
  "12h": 43_200_000, "1d": 86_400_000,
  "1w": 604_800_000,
};

export function completedCandlesNewestFirst<T extends { timestamp: string }>(
  newestFirst: T[],
  timeframe: string,
  nowMs = Date.now()
): T[] {
  if (newestFirst.length === 0) return [];

  const timeframeMs = TIMEFRAME_MS[timeframe];
  if (!timeframeMs) {
    throw new Error(`Unsupported candle timeframe: ${timeframe}`);
  }

  const newestOpenMs = Date.parse(newestFirst[0].timestamp);
  if (!Number.isFinite(newestOpenMs)) {
    throw new Error("Invalid candle timestamp");
  }

  return newestOpenMs + timeframeMs > nowMs
    ? newestFirst.slice(1)
    : newestFirst;
}
