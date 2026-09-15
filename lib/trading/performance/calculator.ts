export type PerformanceResult = {
  result: "WIN" | "LOSS" | "BREAKEVEN";
  realizedRMultiple: number;
};

export function calculateRealizedR(
  direction: "LONG" | "SHORT",
  entryPrice: number,
  stopLossPrice: number,
  exitPrice: number
): PerformanceResult {
  const riskDistance = Math.abs(entryPrice - stopLossPrice);

  if (riskDistance <= 0) {
    throw new Error("Entry and stop loss must have a valid distance");
  }

  let pnlDistance: number;

  if (direction === "LONG") {
    pnlDistance = exitPrice - entryPrice;
  } else {
    pnlDistance = entryPrice - exitPrice;
  }

  const realizedRMultiple = pnlDistance / riskDistance;

  let result: PerformanceResult["result"];

  if (realizedRMultiple > 0) {
    result = "WIN";
  } else if (realizedRMultiple < 0) {
    result = "LOSS";
  } else {
    result = "BREAKEVEN";
  }

  return {
    result,
    realizedRMultiple,
  };
}