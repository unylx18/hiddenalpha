import {
  MultiTimeframeResult,
} from "@/lib/trading/mtf/types";

const MTF_CONFIRMATION_THRESHOLD = 70;

export type MTFGateResult = {
  allowed: boolean;
  direction: "LONG" | "SHORT" | "WAIT";
  reason: string;
};

export function evaluateMTFGate(
  mtf: MultiTimeframeResult
): MTFGateResult {
  if (mtf.overallBias === "NEUTRAL") {
    return {
      allowed: false,
      direction: "WAIT",
      reason:
        "Multi-timeframe bias is neutral",
    };
  }

  if (
    mtf.alignment <
    MTF_CONFIRMATION_THRESHOLD
  ) {
    return {
      allowed: false,
      direction: "WAIT",
      reason:
        `Multi-timeframe alignment is ${mtf.alignment}%, below the ${MTF_CONFIRMATION_THRESHOLD}% confirmation threshold`,
    };
  }

  if (mtf.overallBias === "BULLISH") {
    return {
      allowed: true,
      direction: "LONG",
      reason:
        `Bullish multi-timeframe alignment confirmed at ${mtf.alignment}%`,
    };
  }

  return {
    allowed: true,
    direction: "SHORT",
    reason:
      `Bearish multi-timeframe alignment confirmed at ${mtf.alignment}%`,
  };
}