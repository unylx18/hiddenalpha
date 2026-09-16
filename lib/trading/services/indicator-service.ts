import { createAdminClient } from "@/lib/supabase/admin";

import {
  calculateEMA,
  calculateRSI,
  calculateATR,
} from "@/lib/trading/calculations/indicators";

import { IndicatorResult } from "@/lib/trading/types/indicator";

export async function calculateMarketIndicators(
  symbol: string,
  timeframe: string
): Promise<IndicatorResult> {
  const supabase =
    createAdminClient();

  /*
   * ========================================
   * EXCHANGE
   * ========================================
   */

  const {
    data: exchange,
    error: exchangeError,
  } = await supabase
    .from("exchanges")
    .select("id")
    .eq("slug", "bybit")
    .single();

  if (
    exchangeError ||
    !exchange
  ) {
    throw new Error(
      "Bybit exchange not found"
    );
  }

  /*
   * ========================================
   * MARKET
   * ========================================
   */

  const {
    data: market,
    error: marketError,
  } = await supabase
    .from("markets")
    .select(
      "id, symbol, market_type"
    )
    .eq(
      "exchange_id",
      exchange.id
    )
    .eq(
      "symbol",
      symbol
    )
    .eq(
      "market_type",
      "PERPETUAL"
    )
    .eq(
      "status",
      "ACTIVE"
    )
    .single();

  if (
    marketError ||
    !market
  ) {
    throw new Error(
      `Market not found: ${symbol}`
    );
  }

  /*
   * ========================================
   * LATEST CANDLES
   * ========================================
   *
   * IMPORTANT:
   *
   * Query newest candles first.
   *
   * We request 501 rows because the newest
   * candle may still be forming.
   *
   * The forming candle is removed before
   * indicator calculation.
   */

  const {
    data: candles,
    error: candleError,
  } = await supabase
    .from("candles")
    .select(
      `
        timestamp,
        open,
        high,
        low,
        close,
        volume
      `
    )
    .eq(
      "market_id",
      market.id
    )
    .eq(
      "timeframe",
      timeframe
    )
    .order(
      "timestamp",
      {
        ascending: false,
      }
    )
    .limit(501);

  if (candleError) {
    throw candleError;
  }

  if (
    !candles ||
    candles.length < 16
  ) {
    throw new Error(
      `Not enough candle data for ${symbol} ${timeframe}`
    );
  }

  /*
   * Newest DB candle may still
   * be the currently-forming candle.
   *
   * Remove it.
   */

  const completedCandles =
    candles
      .slice(1)
      .map((candle) => ({
        timestamp:
          candle.timestamp,

        open:
          Number(
            candle.open
          ),

        high:
          Number(
            candle.high
          ),

        low:
          Number(
            candle.low
          ),

        close:
          Number(
            candle.close
          ),

        volume:
          Number(
            candle.volume
          ),
      }))
      .sort(
        (a, b) =>
          new Date(
            a.timestamp
          ).getTime() -
          new Date(
            b.timestamp
          ).getTime()
      );

  if (
    completedCandles.length <
    15
  ) {
    throw new Error(
      `Not enough completed candle data for ${symbol} ${timeframe}`
    );
  }

  /*
   * ========================================
   * INDICATOR INPUT
   * ========================================
   */

  const closes =
    completedCandles.map(
      (candle) =>
        candle.close
    );

  const highs =
    completedCandles.map(
      (candle) =>
        candle.high
    );

  const lows =
    completedCandles.map(
      (candle) =>
        candle.low
    );

  const latest =
    completedCandles[
      completedCandles.length -
        1
    ];

  /*
   * ========================================
   * RESULT
   * ========================================
   */

  return {
    symbol:
      market.symbol,

    timeframe,

    timestamp:
      latest.timestamp,

    price:
      latest.close,

    ema20:
      calculateEMA(
        closes,
        20
      ),

    ema50:
      calculateEMA(
        closes,
        50
      ),

    ema200:
      calculateEMA(
        closes,
        200
      ),

    rsi14:
      calculateRSI(
        closes,
        14
      ),

    atr14:
      calculateATR(
        highs,
        lows,
        closes,
        14
      ),
  };
}