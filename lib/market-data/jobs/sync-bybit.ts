import { ingestBybitCandles } from "@/lib/market-data/ingest-candles";

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

const TIMEFRAMES = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "12h",
  "1d",
  "1w",
  "1M",
];

export async function syncBybitMarkets() {
  const results = [];

  for (const symbol of SYMBOLS) {
    for (const timeframe of TIMEFRAMES) {
      try {
        const result = await ingestBybitCandles({
          symbol,
          timeframe,
          limit: 100,
        });

        results.push({
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          success: false,
          symbol,
          timeframe,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }
  }

  return results;
}