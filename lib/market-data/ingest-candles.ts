import { createAdminClient } from "@/lib/supabase/admin";
import { getBybitKlines } from "@/lib/market-data/bybit";
import { NormalizedCandle } from "@/lib/market-data/types/candle";
import { getBybitTimeframe } from "@/lib/market-data/config/timeframes";

type IngestCandlesParams = {
  symbol: string;
  timeframe: string;
  limit?: number;
};

export async function ingestBybitCandles({
  symbol,
  timeframe,
  limit = 100,
}: IngestCandlesParams) {
  const supabase = createAdminClient();

  const { data: exchange, error: exchangeError } = await supabase
    .from("exchanges")
    .select("id, slug")
    .eq("slug", "bybit")
    .single();

  if (exchangeError || !exchange) {
    throw new Error("Bybit exchange not found");
  }

  const { data: market, error: marketError } = await supabase
    .from("markets")
    .select("id, symbol, market_type")
    .eq("symbol", symbol)
    .eq("market_type", "PERPETUAL")
    .eq("status", "ACTIVE")
    .eq("exchange_id", exchange.id)
    .single();

  if (marketError || !market) {
    throw new Error(`Market not found: Bybit ${symbol} PERPETUAL`);
  }

  const providerTimeframe = getBybitTimeframe(timeframe);

  const candles = await getBybitKlines(
    symbol,
    providerTimeframe,
    limit
  );

  const normalizedCandles: NormalizedCandle[] = candles.map((candle) => ({
    marketId: market.id,
    symbol: market.symbol,
    exchange: exchange.slug,
    marketType: "PERPETUAL",

    timeframe,
    timestamp: new Date(candle.openTime).toISOString(),

    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));

  const rows = normalizedCandles.map((candle) => ({
    market_id: candle.marketId,
    timeframe: candle.timeframe,
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));

  const { data, error } = await supabase
    .from("candles")
    .upsert(rows, {
      onConflict: "market_id,timeframe,timestamp",
    })
    .select();

  if (error) {
    throw error;
  }

  return {
    symbol,
    exchange: exchange.slug,
    marketType: market.market_type,
    timeframe,
    count: data.length,
    data,
  };
}