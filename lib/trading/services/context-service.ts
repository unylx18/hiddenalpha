import { createAdminClient } from "@/lib/supabase/admin";
import { calculateMarketIndicators } from "@/lib/trading/services/indicator-service";
import { calculateMarketRegime } from "@/lib/trading/regime/calculator";
import { calculateVolumeAnalysis } from "@/lib/trading/volume/calculator";
import { scoreMarketContext } from "@/lib/trading/context/scorer";
import { MarketContext } from "@/lib/trading/context/types";
import { calculateAlphaContext } from "@/lib/trading/context/alpha-calculator";
import { calculateAlphaScore } from "@/lib/trading/context/alpha-score-calculator";

export async function getMarketContext(
  symbol: string,
  timeframe: string
): Promise<MarketContext> {
  const supabase = createAdminClient();

  const indicators = await calculateMarketIndicators(
    symbol,
    timeframe
  );

  const regime = calculateMarketRegime(
    indicators
  );

  const { data: exchange, error: exchangeError } =
    await supabase
      .from("exchanges")
      .select("id")
      .eq("slug", "bybit")
      .single();

  if (exchangeError || !exchange) {
    throw new Error("Bybit exchange not found");
  }

  const { data: market, error: marketError } =
    await supabase
      .from("markets")
      .select("id")
      .eq("exchange_id", exchange.id)
      .eq("symbol", symbol)
      .eq("market_type", "PERPETUAL")
      .eq("status", "ACTIVE")
      .single();

  if (marketError || !market) {
    throw new Error(`Market not found: ${symbol}`);
  }

  const { data: candles, error: candleError } =
    await supabase
      .from("candles")
      .select("volume")
      .eq("market_id", market.id)
      .eq("timeframe", timeframe)
      .order("timestamp", { ascending: true })
      .limit(500);

  if (candleError) {
    throw candleError;
  }

  if (!candles || candles.length === 0) {
    throw new Error(
      `No candle volume data for ${symbol} ${timeframe}`
    );
  }

  const volumes = candles.map(
    (candle) => Number(candle.volume)
  );

  const volume = calculateVolumeAnalysis(
    volumes,
    20
  );

  const alpha = calculateAlphaContext(
  indicators
);

  const alphaScore =
  calculateAlphaScore(alpha);

  const baseContext = {
    symbol,
    timeframe,
    timestamp: indicators.timestamp,
    indicators,
    regime,
    volume,
    alpha,
  };

  const score = scoreMarketContext(baseContext);

  return {
    ...baseContext,
    score,
    alphaScore,
  };
}