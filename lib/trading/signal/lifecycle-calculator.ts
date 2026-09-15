export type SignalLifecycleStatus =
  | "ACTIVE"
  | "INVALIDATED"
  | "COMPLETED";

export type SignalLifecycleInput = {
  direction: "LONG" | "SHORT";
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  currentPrice: number;
};

export function calculateSignalLifecycle(
  input: SignalLifecycleInput
): SignalLifecycleStatus {
  const {
    direction,
    stopLossPrice,
    takeProfitPrice,
    currentPrice,
  } = input;

  if (direction === "LONG") {
    if (currentPrice <= stopLossPrice) {
      return "INVALIDATED";
    }

    if (currentPrice >= takeProfitPrice) {
      return "COMPLETED";
    }
  }

  if (direction === "SHORT") {
    if (currentPrice >= stopLossPrice) {
      return "INVALIDATED";
    }

    if (currentPrice <= takeProfitPrice) {
      return "COMPLETED";
    }
  }

  return "ACTIVE";
}