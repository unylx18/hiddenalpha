import { createAdminClient } from "@/lib/supabase/admin";
import { calculateMarketIndicators } from "@/lib/trading/services/indicator-service";
import { calculateMarketRegime } from "@/lib/trading/regime/calculator";
import { calculateVolumeAnalysis } from "@/lib/trading/volume/calculator";
import { scoreMarketContext } from "@/lib/trading/context/scorer";
import { MarketContext } from "@/lib/trading/context/types";
import { calculateAlphaContext } from "@/lib/trading/context/alpha-calculator";
import { calculateAlphaScore } from "@/lib/trading/context/alpha-score-calculator";
import {
  detectMarketStructure,
  type MarketStructureCandle,
} from "@/lib/market-structure/detect-swings";

export async function getMarketContext(
  symbol: string,
  timeframe: string
): Promise<MarketContext> {
  const supabase = createAdminClient();

  const indicators =
    await calculateMarketIndicators(
      symbol,
      timeframe
    );

  const regime =
    calculateMarketRegime(
      indicators
    );

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

  const {
    data: market,
    error: marketError,
  } = await supabase
    .from("markets")
    .select("id")
    .eq(
      "exchange_id",
      exchange.id
    )
    .eq("symbol", symbol)
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
   * VOLUME
   * ========================================
   *
   * Exclude the newest candle because
   * it may still be forming.
   */

  const {
    data: volumeCandles,
    error: volumeError,
  } = await supabase
    .from("candles")
    .select(
      "timestamp, volume"
    )
    .eq(
      "market_id",
      market.id
    )
    .eq(
      "timeframe",
      timeframe
    )
    .order("timestamp", {
      ascending: false,
    })
    .limit(501);

  if (volumeError) {
    throw volumeError;
  }

  if (
    !volumeCandles ||
    volumeCandles.length < 2
  ) {
    throw new Error(
      `Not enough candle volume data for ${symbol} ${timeframe}`
    );
  }

  const completedVolumeCandles =
    volumeCandles
      .slice(1)
      .sort(
        (a, b) =>
          new Date(
            a.timestamp
          ).getTime() -
          new Date(
            b.timestamp
          ).getTime()
      );

  const volumes =
    completedVolumeCandles.map(
      (candle) =>
        Number(candle.volume)
    );

  const volume =
    calculateVolumeAnalysis(
      volumes,
      20
    );

  /*
   * ========================================
   * MARKET STRUCTURE
   * ========================================
   *
   * Use up to 2000 candles.
   * Exclude the newest forming candle.
   */

  const {
    data: structureCandles,
    error: structureError,
  } = await supabase
    .from("candles")
    .select(
      "timestamp, open, high, low, close"
    )
    .eq(
      "market_id",
      market.id
    )
    .eq(
      "timeframe",
      timeframe
    )
    .order("timestamp", {
      ascending: false,
    })
    .limit(2001);

  if (structureError) {
    throw structureError;
  }

  if (
    !structureCandles ||
    structureCandles.length < 10
  ) {
    throw new Error(
      `Not enough structure data for ${symbol} ${timeframe}`
    );
  }

  const completedStructureCandles =
    structureCandles
      .slice(1)
      .map(
        (candle) => ({
          timestamp:
            candle.timestamp,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            a.timestamp
          ).getTime() -
          new Date(
            b.timestamp
          ).getTime()
      );

  const normalizedStructureCandles: MarketStructureCandle[] =
    completedStructureCandles;

  const structure =
    detectMarketStructure(
      normalizedStructureCandles,
      {
        leftBars: 2,
        rightBars: 2,
      }
    );

  /*
   * ========================================
   * ALPHA CONTEXT
   * ========================================
   */

  const alpha =
    calculateAlphaContext(
      indicators,
      volume,
      structure
    );

  const alphaScore =
    calculateAlphaScore(
      alpha
    );

  const baseContext = {
    symbol,
    timeframe,
    timestamp:
      indicators.timestamp,
    indicators,
    regime,
    volume,
    alpha,
  };

  const score =
    scoreMarketContext(
      baseContext
    );

  return {
    ...baseContext,
    score,
    alphaScore,
  };
}