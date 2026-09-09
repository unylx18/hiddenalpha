import { TradingSignal } from "@/lib/trading/signal/types";
import { MultiTimeframeResult } from "@/lib/trading/mtf/types";
import { evaluateMTFGate } from "@/lib/trading/mtf/gate";

export type FinalSignalDecision = {
  direction: "LONG" | "SHORT" | "WAIT";
  approved: boolean;
  confidence: number;
  reasons: string[];
};

export function finalizeSignal(
  signal: TradingSignal,
  mtf: MultiTimeframeResult
): FinalSignalDecision {
  const reasons = [
    ...signal.reasons.map((r) => r.message),
  ];

  if (signal.direction === "WAIT") {
    return {
      direction: "WAIT",
      approved: false,
      confidence: signal.confidence,
      reasons,
    };
  }

  if (signal.quality === "REJECTED") {
    return {
      direction: "WAIT",
      approved: false,
      confidence: signal.confidence,
      reasons: [
        ...reasons,
        "Signal quality is rejected",
      ],
    };
  }

  const mtfGate = evaluateMTFGate(mtf);

  if (!mtfGate.allowed) {
    return {
      direction: "WAIT",
      approved: false,
      confidence: Math.min(
        signal.confidence,
        mtf.confidence
      ),
      reasons: [
        ...reasons,
        mtfGate.reason,
      ],
    };
  }

  if (
    mtfGate.direction !== signal.direction
  ) {
    return {
      direction: "WAIT",
      approved: false,
      confidence: Math.min(
        signal.confidence,
        mtf.confidence
      ),
      reasons: [
        ...reasons,
        "Signal direction conflicts with MTF bias",
      ],
    };
  }

  return {
    direction: signal.direction,
    approved: true,
    confidence: Math.min(
      signal.confidence,
      mtf.confidence
    ),
    reasons: [
      ...reasons,
      "Signal passed final MTF confirmation",
    ],
  };
}