const BASE_URL = "http://localhost:3000";

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

const LIMIT = 2000;

async function backfill(symbol, timeframe) {
  const url =
    `${BASE_URL}/api/market/candles` +
    `?symbol=${symbol}` +
    `&timeframe=${timeframe}` +
    `&limit=${LIMIT}`;

  console.log(`\nBackfilling ${symbol} ${timeframe}...`);

  const response = await fetch(url, {
    method: "POST",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || `HTTP ${response.status}`
    );
  }

  console.log(
    `SUCCESS ${symbol} ${timeframe}` +
    ` | count=${result.count}` +
    ` | recovered=${result.recoveredCount ?? 0}`
  );

  return result;
}

async function main() {
  console.log("========================================");
  console.log("Hiddenalpha Candle Backfill");
  console.log("========================================");
  console.log(`Symbols: ${SYMBOLS.length}`);
  console.log(`Timeframes: ${TIMEFRAMES.length}`);
  console.log(`Target candles: ${LIMIT}`);
  console.log("========================================");

  let successCount = 0;
  let failedCount = 0;

  for (const symbol of SYMBOLS) {
    for (const timeframe of TIMEFRAMES) {
      try {
        await backfill(symbol, timeframe);
        successCount++;
      } catch (error) {
        failedCount++;

        console.error(
          `FAILED ${symbol} ${timeframe}:`,
          error instanceof Error
            ? error.message
            : String(error)
        );
      }
    }
  }

  console.log("\n========================================");
  console.log("BACKFILL COMPLETE");
  console.log("========================================");
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});