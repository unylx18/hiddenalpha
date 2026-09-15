import { createAdminClient } from "@/lib/supabase/admin";
import { getBybitKlines } from "@/lib/market-data/bybit";
import { NormalizedCandle } from "@/lib/market-data/types/candle";
import { getBybitTimeframe } from "@/lib/market-data/config/timeframes";

type IngestCandlesParams = {
  symbol: string;
  timeframe: string;
  limit?: number;
};

const TIMEFRAME_SECONDS: Record<string, number> = {
  "1m": 60,
  "3m": 180,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "2h": 7200,
  "4h": 14400,
  "6h": 21600,
  "12h": 43200,
  "1d": 86400,
  "1w": 604800,
};

export async function ingestBybitCandles({
  symbol,
  timeframe,
  limit = 100,
}: IngestCandlesParams) {
  const supabase = createAdminClient();

  const { data: exchange, error: exchangeError } =
    await supabase
      .from("exchanges")
      .select("id, slug")
      .eq("slug", "bybit")
      .single();

  if (exchangeError || !exchange) {
    throw new Error("Bybit exchange not found");
  }

  const { data: market, error: marketError } =
    await supabase
      .from("markets")
      .select("id, symbol, market_type")
      .eq("symbol", symbol)
      .eq("market_type", "PERPETUAL")
      .eq("status", "ACTIVE")
      .eq("exchange_id", exchange.id)
      .single();

  if (marketError || !market) {
    throw new Error(
      `Market not found: Bybit ${symbol} PERPETUAL`
    );
  }

  const providerTimeframe =
    getBybitTimeframe(timeframe);

  const requestedLimit = Math.min(
    Math.max(limit, 1),
    2000
  );

  /*
   * ---------------------------------------------------------
   * GAP RECOVERY
   *
   * Monthly candles (1M) are intentionally skipped because
   * month length is variable and cannot be represented safely
   * with a fixed number of seconds.
   * ---------------------------------------------------------
   */

  const timeframeSeconds =
    TIMEFRAME_SECONDS[timeframe];

  let recoveredCount = 0;

  if (timeframeSeconds) {
    const { data: latestDbCandle, error: latestDbError } =
      await supabase
        .from("candles")
        .select("timestamp")
        .eq("market_id", market.id)
        .eq("timeframe", timeframe)
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (latestDbError) {
      throw latestDbError;
    }

    if (latestDbCandle?.timestamp) {
      const latestDbTime =
        new Date(
          latestDbCandle.timestamp
        ).getTime();

      const latestProviderCandles =
        await getBybitKlines(
          symbol,
          providerTimeframe,
          2
        );

      if (latestProviderCandles.length > 0) {
        const latestProviderTime =
          Math.max(
            ...latestProviderCandles.map(
              (candle) => candle.openTime
            )
          );

        const nextExpectedTime =
          latestDbTime +
          timeframeSeconds * 1000;

        const gapCandles = Math.floor(
          (
            latestProviderTime -
            latestDbTime
          ) /
            (timeframeSeconds * 1000)
        );

        if (gapCandles > 0) {
          const recoveryLimit = Math.min(
            gapCandles + 1,
            1000
          );

          const recoveredCandles =
            await getBybitKlines(
              symbol,
              providerTimeframe,
              recoveryLimit,
              latestProviderTime
            );

          const recoveryRows =
            recoveredCandles
              .filter(
                (candle) =>
                  candle.openTime >=
                    nextExpectedTime &&
                  candle.openTime <=
                    latestProviderTime
              )
              .map(
                (candle) => ({
                  market_id: market.id,
                  timeframe,
                  timestamp:
                    new Date(
                      candle.openTime
                    ).toISOString(),
                  open: candle.open,
                  high: candle.high,
                  low: candle.low,
                  close: candle.close,
                  volume: candle.volume,
                })
              );

          if (recoveryRows.length > 0) {
            const {
              error: recoveryError,
            } = await supabase
              .from("candles")
              .upsert(
                recoveryRows,
                {
                  onConflict:
                    "market_id,timeframe,timestamp",
                }
              );

            if (recoveryError) {
              throw recoveryError;
            }

            recoveredCount =
              recoveryRows.length;
          }
        }
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * NORMAL SYNC
   * ---------------------------------------------------------
   */

  const batchSize = 1000;

  let remaining = requestedLimit;
  let endTime: number | undefined;
  const allCandles = [];

  while (remaining > 0) {
    const batchLimit = Math.min(
      remaining,
      batchSize
    );

    const candles =
      await getBybitKlines(
        symbol,
        providerTimeframe,
        batchLimit,
        endTime
      );

    if (candles.length === 0) {
      break;
    }

    allCandles.push(...candles);

    if (candles.length < batchLimit) {
      break;
    }

    const oldest =
      Math.min(
        ...candles.map(
          (candle) =>
            candle.openTime
        )
      );

    endTime =
      oldest - 1;

    remaining -= candles.length;
  }

  const uniqueCandles =
    Array.from(
      new Map(
        allCandles.map(
          (candle) => [
            candle.openTime,
            candle,
          ]
        )
      ).values()
    )
      .sort(
        (a, b) =>
          a.openTime - b.openTime
      )
      .slice(-requestedLimit);

  const normalizedCandles:
    NormalizedCandle[] =
    uniqueCandles.map(
      (candle) => ({
        marketId: market.id,
        symbol: market.symbol,
        exchange: exchange.slug,
        marketType: "PERPETUAL",
        timeframe,
        timestamp:
          new Date(
            candle.openTime
          ).toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      })
    );

  const rows =
    normalizedCandles.map(
      (candle) => ({
        market_id:
          candle.marketId,
        timeframe:
          candle.timeframe,
        timestamp:
          candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      })
    );

  if (rows.length === 0) {
    return {
      symbol,
      exchange: exchange.slug,
      marketType:
        market.market_type,
      timeframe,
      count: 0,
      recoveredCount,
      data: [],
    };
  }

  const { data, error } =
    await supabase
      .from("candles")
      .upsert(rows, {
        onConflict:
          "market_id,timeframe,timestamp",
      })
      .select();

  if (error) {
    throw error;
  }

  return {
    symbol,
    exchange: exchange.slug,
    marketType:
      market.market_type,
    timeframe,
    count: data.length,
    recoveredCount,
    data,
  };
}