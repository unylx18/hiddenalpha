import { createAdminClient } from "@/lib/supabase/admin";

export async function createMarketSnapshot(
  symbol: string,
  timeframe: string
) {
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
    .order("timestamp", { ascending: false })
    .limit(2);

  if (candleError) {
    throw candleError;
  }

  if (!candles || candles.length < 2) {
    throw new Error(
      `Not enough candle data for ${symbol} ${timeframe}`
    );
  }

  const latest = candles[0];
  const previous = candles[1];

  const price = Number(latest.close);
  const previousClose = Number(previous.close);

  const changePercent =
    ((price - previousClose) / previousClose) * 100;

  const high = Number(latest.high);
  const low = Number(latest.low);
  const volume = Number(latest.volume);

  const { data: snapshot, error: snapshotError } = await supabase
    .from("market_snapshots")
    .upsert(
      {
        market_id: market.id,
        timeframe,
        timestamp: latest.timestamp,
        price,
        change_percent: changePercent,
        volume,
        high,
        low,
      },
      {
        onConflict: "market_id,timeframe,timestamp",
      }
    )
    .select()
    .single();

  if (snapshotError) {
    throw snapshotError;
  }

  return snapshot;
}