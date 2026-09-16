import { ingestBybitCandles } from "@/lib/market-data/ingest-candles";

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

const TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "1h",
];

type SyncResult = {
  success: boolean;
  symbol: string;
  timeframe: string;
  count?: number;
  error?: string;
};

async function syncOne(
  symbol: string,
  timeframe: string
): Promise<SyncResult> {
  try {
    const result =
      await ingestBybitCandles({
        symbol,
        timeframe,

        /*
         * Pull latest 100 candles.
         *
         * Upsert keeps the operation safe
         * and also fills recent gaps if
         * HiddenAlpha has been offline.
         */
        limit: 100,
      });

    return {
      success: true,
      symbol,
      timeframe,
      count: result.count,
    };
  } catch (error) {
    return {
      success: false,
      symbol,
      timeframe,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

export async function syncBybitMarkets() {
  /*
   * 3 symbols × 4 engine timeframes.
   *
   * All combinations are independent,
   * so run them concurrently rather
   * than waiting sequentially.
   */

  const jobs =
    SYMBOLS.flatMap(
      (symbol) =>
        TIMEFRAMES.map(
          (timeframe) => ({
            symbol,
            timeframe,
          })
        )
    );

  const results =
    await Promise.all(
      jobs.map(
        ({ symbol, timeframe }) =>
          syncOne(
            symbol,
            timeframe
          )
      )
    );

  return results;
}