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
  const supabase = createAdminClient();

  const { data: exchange, error: exchangeError } = await supabase
    .from("exchanges")
    .select("id")
    .eq("slug", "bybit")
    .single();

  if (exchangeError || !exchange) {
    throw new Error("Bybit exchange not found");
  }

  const { data: market, error: marketError } = await supabase
    .from("markets")
    .select("id, symbol, market_type")
    .eq("exchange_id", exchange.id)
    .eq("symbol", symbol)
    .eq("market_type", "PERPETUAL")
    .eq("status", "ACTIVE")
    .single();

  if (marketError || !market) {
    throw new Error(`Market not found: ${symbol}`);
  }

  const { data: candles, error: candleError } = await supabase
    .from("candles")
    .select(
      "timestamp, open, high, low, close, volume"
    )
    .eq("market_id", market.id)
    .eq("timeframe", timeframe)
    .order("timestamp", { ascending: true })
    .limit(500);

  if (candleError) {
    throw candleError;
  }

  if (!candles || candles.length < 15) {
    throw new Error(
      `Not enough candle data for ${symbol} ${timeframe}`
    );
  }

  const closes = candles.map((candle) => Number(candle.close));
  const highs = candles.map((candle) => Number(candle.high));
  const lows = candles.map((candle) => Number(candle.low));

  const latest = candles[candles.length - 1];

  return {
    symbol: market.symbol,
    timeframe,
    timestamp: latest.timestamp,

    price: Number(latest.close),

    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),

    rsi14: calculateRSI(closes, 14),

    atr14: calculateATR(
      highs,
      lows,
      closes,
      14
    ),
  };
}