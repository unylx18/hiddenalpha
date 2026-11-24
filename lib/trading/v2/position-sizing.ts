/**
 * V2 read-only position sizing, no broker/network/database calls.
 * All supported instruments are quoted in USD (BTCUSDT etc treated as USD-equivalent).
 * This is an estimate: gaps, spreads, inverse contracts, funding and executions can
 * exceed the modeled losses. The user must verify their broker contract specification.
 */
export type V2SizingSymbol =
  | "BTCUSDT" | "ETHUSDT" | "SOLUSDT"
  | "XAUUSD" | "EURUSD" | "GBPUSD";
export type V2SizingDirection = "LONG" | "SHORT";

export type V2SizingInput = {
  symbol: V2SizingSymbol;
  direction: V2SizingDirection;
  equityUsd: number;
  riskPercent: number;
  entry: number;
  stop: number;
  target?: number;
  /** Estimated combined entry+exit fees in basis points of entry notional. */
  roundTripFeesBps: number;
  /** Estimated total adverse execution slippage in basis points of entry notional. */
  slippageBps: number;
  /** Exchange base-asset quantity step for crypto. */
  cryptoQuantityStep?: number;
  /** Broker instrument contract size (base units/oz per standard lot) for Forex/metals. */
  contractUnitsPerLot?: number;
  /** Broker's supported lot increment. */
  lotStep?: number;
};

export type V2SizingResult = {
  market: "crypto" | "forex";
  riskBudgetUsd: number;
  estimatedStopLossUsd: number;
  estimatedTargetNetUsd: number | null;
  grossRiskReward: number | null;
  netRiskReward: number | null;
  stopDistance: number;
  quantity: number;
  lots: number | null;
  notionalUsd: number;
  riskPerUnitUsd: number;
  estimatedRoundTripCostUsd: number;
  riskUtilizationPercent: number;
};

function positiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(label + " must be a finite number above zero.");
  }
}
function nonnegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(label + " must be a nonnegative finite number.");
  }
}

/** Floor by declared broker/exchange increment; never round the position up. */
function floorStep(value: number, step: number): number {
  const scaled = Math.floor(value / step + 1e-10);
  return Number((scaled * step).toPrecision(13));
}

export function calculateV2PositionSize(input: V2SizingInput): V2SizingResult {
  const {
    symbol, direction, equityUsd, riskPercent, entry, stop, target,
    roundTripFeesBps, slippageBps,
  } = input;
  const isForex = symbol === "XAUUSD" || symbol === "EURUSD" || symbol === "GBPUSD";
  const isCrypto = symbol === "BTCUSDT" || symbol === "ETHUSDT" || symbol === "SOLUSDT";
  if (!isForex && !isCrypto) throw new Error("Unsupported market instrument.");
  if (direction !== "LONG" && direction !== "SHORT") throw new Error("Choose LONG or SHORT.");

  positiveFinite(equityUsd, "Account equity (USD)");
  positiveFinite(entry, "Entry price");
  positiveFinite(stop, "Stop price");
  positiveFinite(riskPercent, "Risk percent");
  if (riskPercent > 5) throw new Error("Maximum modeled risk is 5% of account equity.");
  nonnegativeFinite(roundTripFeesBps, "Round-trip fee estimate (bps)");
  nonnegativeFinite(slippageBps, "Total slippage estimate (bps)");
  if (roundTripFeesBps > 1000 || slippageBps > 1000) {
    throw new Error("Cost estimates cannot exceed 1,000 bps each.");
  }
  if (direction === "LONG" && stop >= entry) throw new Error("LONG stop must be below entry.");
  if (direction === "SHORT" && stop <= entry) throw new Error("SHORT stop must be above entry.");
  if (target !== undefined) {
    positiveFinite(target, "Target price");
    if ((direction === "LONG" && target <= entry) ||
        (direction === "SHORT" && target >= entry)) {
      throw new Error("Target must be profitable relative to entry and direction.");
    }
  }

  const riskBudgetUsd = equityUsd * riskPercent / 100;
  const stopDistance = Math.abs(entry - stop);
  const roundTripCostRate = (roundTripFeesBps + slippageBps) / 10_000;
  const riskPerUnitUsd = stopDistance + entry * roundTripCostRate;
  const rawQuantity = riskBudgetUsd / riskPerUnitUsd;

  let lots: number | null = null;
  let quantity: number;
  if (isForex) {
    const perLot = input.contractUnitsPerLot;
    const lotStep = input.lotStep;
    if (perLot === undefined || lotStep === undefined) {
      throw new Error("Forex requires your broker's contract units per lot and lot increment.");
    }
    positiveFinite(perLot, "Broker contract units per lot");
    positiveFinite(lotStep, "Lot step");
    if (lotStep > 1) throw new Error("Lot step must not exceed one standard lot.");
    lots = floorStep(rawQuantity / perLot, lotStep);
    quantity = lots * perLot;
  } else {
    const step = input.cryptoQuantityStep;
    if (step === undefined) throw new Error("Provide your exchange's quantity increment.");
    positiveFinite(step, "Crypto quantity step");
    quantity = floorStep(rawQuantity, step);
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Risk budget is too small for the supplied minimum quantity or lot step.");
  }
  const estimatedRoundTripCostUsd = quantity * entry * roundTripCostRate;
  const estimatedStopLossUsd = quantity * stopDistance + estimatedRoundTripCostUsd;
  const estimatedTargetNetUsd = target === undefined
    ? null
    : quantity * Math.abs(target - entry) - estimatedRoundTripCostUsd;
  return {
    market: isForex ? "forex" : "crypto",
    riskBudgetUsd,
    estimatedStopLossUsd,
    estimatedTargetNetUsd,
    grossRiskReward: target === undefined ? null : Math.abs(target - entry) / stopDistance,
    netRiskReward: estimatedTargetNetUsd === null ? null : estimatedTargetNetUsd / estimatedStopLossUsd,
    stopDistance,
    quantity,
    lots,
    notionalUsd: entry * quantity,
    riskPerUnitUsd,
    estimatedRoundTripCostUsd,
    riskUtilizationPercent: (estimatedStopLossUsd / riskBudgetUsd) * 100,
  };
}
