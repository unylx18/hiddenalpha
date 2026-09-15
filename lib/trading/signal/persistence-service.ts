import { generateSignal } from "@/lib/trading/signal/signal-service";
import { saveTradingSignal } from "@/lib/trading/signal/repository";
import { getMarketContext } from "@/lib/trading/services/context-service";
import { calculateTradeSetup } from "@/lib/trading/setup/calculator";

export async function generateAndSaveSignal(
  symbol: string,
  timeframe: string
) {
  const signal = await generateSignal(
    symbol,
    timeframe
  );

  let signalToSave = signal;

  if (
    signal.direction === "LONG" ||
    signal.direction === "SHORT"
  ) {
    const context =
      await getMarketContext(
        symbol,
        timeframe
      );

    const setup =
      calculateTradeSetup(
        context,
        signal.direction
      );

    signalToSave = {
      ...signal,
      entryPrice: setup.entryPrice,
      stopLossPrice:
        setup.stopLossPrice,
      takeProfitPrice:
        setup.takeProfitPrice,
    };
  }

  const savedSignal =
    await saveTradingSignal(
      signalToSave
    );

  return {
    signal: signalToSave,
    savedSignal,
  };
}