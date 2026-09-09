import { getMarketContext } from "@/lib/trading/services/context-service";
import { generateSignal } from "@/lib/trading/signal/signal-service";
import { calculateTradeSetup } from "@/lib/trading/setup/calculator";
import { TradingSignal } from "@/lib/trading/signal/types";
import { TradeSetup } from "@/lib/trading/setup/types";

export type GeneratedTradeSetup = {
  signal: TradingSignal;
  setup: TradeSetup;
};

export async function generateTradeSetup(
  symbol: string,
  timeframe: string
): Promise<GeneratedTradeSetup> {
  const context = await getMarketContext(
    symbol,
    timeframe
  );

  const signal = await generateSignal(
    symbol,
    timeframe
  );

  if (
    signal.direction !== "LONG" &&
    signal.direction !== "SHORT"
  ) {
    throw new Error(
      "Trade setup cannot be generated without a confirmed LONG or SHORT signal"
    );
  }

  if (signal.quality !== "VALID") {
    throw new Error(
      `Trade setup requires a VALID signal. Current quality: ${signal.quality}`
    );
  }

  const setup = calculateTradeSetup(
    context,
    signal.direction
  );

  return {
    signal,
    setup,
  };
}