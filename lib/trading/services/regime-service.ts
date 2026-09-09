import { calculateMarketIndicators } from "@/lib/trading/services/indicator-service";
import { calculateMarketRegime } from "@/lib/trading/regime/calculator";
import { MarketRegimeResult } from "@/lib/trading/regime/types";

export async function getMarketRegime(
  symbol: string,
  timeframe: string
): Promise<MarketRegimeResult> {
  const indicators = await calculateMarketIndicators(
    symbol,
    timeframe
  );

  return calculateMarketRegime(indicators);
}