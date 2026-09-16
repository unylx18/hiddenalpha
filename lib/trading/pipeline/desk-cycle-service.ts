import {
  syncBybitMarkets,
} from "@/lib/market-data/jobs/sync-bybit";

import {
  runTradingPipeline,
  type TradingPipelineInput,
} from "@/lib/trading/pipeline/service";

export type DeskCycleInput =
  TradingPipelineInput;

export async function runDeskCycle(
  input: DeskCycleInput = {}
) {
  const cycleStartedAt =
    performance.now();

  /*
   * ========================================
   * STAGE 1 — MARKET DATA SYNC
   * ========================================
   *
   * Server-side source of fresh candle data.
   *
   * The trading pipeline must never run
   * against a partially failed market sync.
   */

  const marketStartedAt =
    performance.now();

  const marketResults =
    await syncBybitMarkets();

  const marketDurationMs =
    performance.now() -
    marketStartedAt;

  const marketSuccessCount =
    marketResults.filter(
      (result) =>
        result.success
    ).length;

  const marketFailedCount =
    marketResults.filter(
      (result) =>
        !result.success
    ).length;

  const market = {
    provider:
      "bybit",

    total:
      marketResults.length,

    successCount:
      marketSuccessCount,

    failedCount:
      marketFailedCount,

    results:
      marketResults,

    durationMs:
      Math.round(
        marketDurationMs
      ),
  };

  /*
   * ========================================
   * MARKET DATA SAFETY GATE
   * ========================================
   *
   * No signal lifecycle / publication should
   * run from a partially failed market cycle.
   */

  if (
    marketFailedCount >
    0
  ) {
    return {
      success: false,

      timestamp:
        new Date().toISOString(),

      stage:
        "MARKET_SYNC_FAILED" as const,

      market,

      pipeline:
        null,

      timing: {
        marketMs:
          Math.round(
            marketDurationMs
          ),

        pipelineMs:
          0,

        totalMs:
          Math.round(
            performance.now() -
              cycleStartedAt
          ),
      },
    };
  }

  /*
   * ========================================
   * STAGE 2 — TRADING PIPELINE
   * ========================================
   *
   * Market data is now fresh.
   *
   * Lifecycle
   *    ↓
   * Publisher
   *    ↓
   * Active Signal Snapshot
   */

  const pipelineStartedAt =
    performance.now();

  const pipeline =
    await runTradingPipeline(
      input
    );

  const pipelineDurationMs =
    performance.now() -
    pipelineStartedAt;

  /*
   * ========================================
   * AUTHORITATIVE DESK RESULT
   * ========================================
   */

  return {
    success: true,

    timestamp:
      new Date().toISOString(),

    stage:
      "COMPLETED" as const,

    market,

    pipeline,

    timing: {
      marketMs:
        Math.round(
          marketDurationMs
        ),

      pipelineMs:
        Math.round(
          pipelineDurationMs
        ),

      totalMs:
        Math.round(
          performance.now() -
            cycleStartedAt
        ),
    },
  };
}