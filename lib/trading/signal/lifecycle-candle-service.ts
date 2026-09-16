import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type LifecycleCandle = {
  timestamp: string;

  open: number;
  high: number;
  low: number;
  close: number;

  /*
   * True when this candle started
   * before the lifecycle observation
   * window.
   *
   * We must be careful with its
   * high/low because part of that range
   * happened before last_checked_at.
   */
  overlapsStart:
    boolean;
};

type LifecycleCandleInput = {
  symbol: string;

  fromTimestamp: string;

  toTimestamp?:
    string;
};

function floorToMinute(
  timestamp: string
) {
  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      `Invalid lifecycle timestamp: ${timestamp}`
    );
  }

  date.setUTCSeconds(
    0,
    0
  );

  return date.toISOString();
}

function normalizePrice(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

export async function getLifecycleCandles({
  symbol,
  fromTimestamp,
  toTimestamp =
    new Date().toISOString(),
}: LifecycleCandleInput): Promise<
  LifecycleCandle[]
> {
  const normalizedSymbol =
    symbol
      .trim()
      .toUpperCase();

  if (
    !normalizedSymbol
  ) {
    throw new Error(
      "Lifecycle candle symbol is required"
    );
  }

  const fromDate =
    new Date(
      fromTimestamp
    );

  const toDate =
    new Date(
      toTimestamp
    );

  if (
    Number.isNaN(
      fromDate.getTime()
    ) ||
    Number.isNaN(
      toDate.getTime()
    )
  ) {
    throw new Error(
      "Invalid lifecycle candle time range"
    );
  }

  if (
    fromDate.getTime() >
    toDate.getTime()
  ) {
    throw new Error(
      "Lifecycle candle start cannot be after end"
    );
  }

  const supabase =
    createAdminClient();

  /*
   * ========================================
   * MARKET
   * ========================================
   */

  const {
    data:
      market,

    error:
      marketError,
  } =
    await supabase
      .from(
        "markets"
      )
      .select(
        "id, symbol, market_type"
      )
      .eq(
        "symbol",
        normalizedSymbol
      )
      .eq(
        "market_type",
        "PERPETUAL"
      )
      .limit(1)
      .maybeSingle();

  if (
    marketError
  ) {
    throw new Error(
      `Failed to load lifecycle market: ${marketError.message}`
    );
  }

  if (!market) {
    throw new Error(
      `Market ${normalizedSymbol} PERPETUAL not found`
    );
  }

  /*
   * ========================================
   * 1 MINUTE CANDLES
   * ========================================
   *
   * We use 1m regardless of the signal
   * timeframe.
   *
   * Example:
   *
   * Signal timeframe = 1h
   * Scheduler gap    = 5m
   *
   * Lifecycle still inspects every stored
   * 1m high / low inside that gap.
   */

  const queryStart =
    floorToMinute(
      fromTimestamp
    );

  const {
    data:
      candleRows,

    error:
      candleError,
  } =
    await supabase
      .from(
        "candles"
      )
      .select(
        `
        timestamp,
        open,
        high,
        low,
        close
        `
      )
      .eq(
        "market_id",
        market.id
      )
      .eq(
        "timeframe",
        "1m"
      )
      .gte(
        "timestamp",
        queryStart
      )
      .lte(
        "timestamp",
        toDate.toISOString()
      )
      .order(
        "timestamp",
        {
          ascending:
            true,
        }
      )
      .limit(
        1000
      );

  if (
    candleError
  ) {
    throw new Error(
      `Failed to load lifecycle candles: ${candleError.message}`
    );
  }

  const fromMs =
    fromDate.getTime();

  const candles:
    LifecycleCandle[] =
      [];

  for (
    const row of
      candleRows ?? []
  ) {
    const candleTimestamp =
      new Date(
        row.timestamp
      );

    const timestampMs =
      candleTimestamp.getTime();

    const open =
      normalizePrice(
        row.open
      );

    const high =
      normalizePrice(
        row.high
      );

    const low =
      normalizePrice(
        row.low
      );

    const close =
      normalizePrice(
        row.close
      );

    if (
      Number.isNaN(
        timestampMs
      ) ||
      open === null ||
      high === null ||
      low === null ||
      close === null
    ) {
      continue;
    }

    /*
     * Basic OHLC integrity.
     */

    if (
      high <
        low ||
      high <
        Math.max(
          open,
          close
        ) ||
      low >
        Math.min(
          open,
          close
        )
    ) {
      continue;
    }

    candles.push({
      timestamp:
        candleTimestamp.toISOString(),

      open,
      high,
      low,
      close,

      overlapsStart:
        timestampMs <
        fromMs,
    });
  }

  return candles;
}