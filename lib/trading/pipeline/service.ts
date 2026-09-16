import {
  monitorActiveSignals,
} from "@/lib/trading/signal/lifecycle-monitor-service";

import {
  publishBestOpportunity,
} from "@/lib/trading/signal/publisher-service";

import {
  getActiveTradingSignals,
} from "@/lib/trading/signal/repository";

export type TradingPipelineInput = {
  symbols?: string[];

  accountBalance?: number;

  riskPercent?: number;

  leverage?: number;
};

export async function runTradingPipeline(
  input: TradingPipelineInput = {}
) {
  const {
    symbols,

    accountBalance = 10000,

    riskPercent = 1,

    leverage = 1,
  } = input;

  /*
   * ========================================
   * STAGE 1 — LIFECYCLE
   * ========================================
   *
   * Existing signals are always evaluated
   * before HiddenAlpha considers publishing
   * another opportunity.
   */

  const lifecycleStartedAt =
    performance.now();

  const lifecycle =
    await monitorActiveSignals();

  const lifecycleDurationMs =
    performance.now() -
    lifecycleStartedAt;

  /*
   * ========================================
   * STAGE 2 — PUBLISHER
   * ========================================
   *
   * Scanner / quality gate / anti-duplicate
   * logic remains inside Publisher.
   */

  const publisherStartedAt =
    performance.now();

  const publisher =
    await publishBestOpportunity({
      symbols,

      accountBalance,

      riskPercent,

      leverage,
    });

  const publisherDurationMs =
    performance.now() -
    publisherStartedAt;

  /*
   * ========================================
   * STAGE 3 — ACTIVE SIGNAL SNAPSHOT
   * ========================================
   */

  const activeSignals =
    await getActiveTradingSignals();

  /*
   * ========================================
   * RESULT
   * ========================================
   */

  return {
    timestamp:
      new Date().toISOString(),

    lifecycle,

    publisher,

    activeSignals,

    timing: {
      lifecycleMs:
        Math.round(
          lifecycleDurationMs
        ),

      publisherMs:
        Math.round(
          publisherDurationMs
        ),

      totalMs:
        Math.round(
          lifecycleDurationMs +
            publisherDurationMs
        ),
    },
  };
}