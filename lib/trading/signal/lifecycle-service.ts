
import {
  getTradingSignalById,
  updateTradingSignalStatus,
} from "@/lib/trading/signal/repository";

import {
  calculateSignalLifecycle,
} from "@/lib/trading/signal/lifecycle-calculator";

export async function updateSignalLifecycle(
  signalId: string,
  currentPrice: number
) {
  const signal =
    await getTradingSignalById(signalId);

  if (signal.status !== "ACTIVE") {
    return signal;
  }

  if (
    signal.direction !== "LONG" &&
    signal.direction !== "SHORT"
  ) {
    return signal;
  }

  const entryPrice =
    Number(signal.entry_price);

  const stopLossPrice =
    Number(signal.stop_loss_price);

  const takeProfitPrice =
    Number(signal.take_profit_price);

  if (
    entryPrice <= 0 ||
    stopLossPrice <= 0 ||
    takeProfitPrice <= 0
  ) {
    throw new Error(
      "Signal does not contain valid trade levels"
    );
  }

  const newStatus =
    calculateSignalLifecycle({
      direction: signal.direction,
      entryPrice,
      stopLossPrice,
      takeProfitPrice,
      currentPrice,
    });

  if (newStatus === "ACTIVE") {
    return signal;
  }

  return updateTradingSignalStatus(
    signalId,
    newStatus
  );
}