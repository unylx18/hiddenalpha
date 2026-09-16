import {
  syncBybitMarkets,
} from "@/lib/market-data/jobs/sync-bybit";

import {
  runTradingPipeline,
  type TradingPipelineInput,
} from "@/lib/trading/pipeline/service";

import {
  acquireRuntimeLock,
  releaseRuntimeLock,
  type RuntimeLock,
} from "@/lib/trading/pipeline/runtime-lock-service";

import {
  saveDeskRun,
  type DeskRunRecord,
} from "@/lib/trading/pipeline/desk-run-repository";

const DESK_LOCK_NAME =
  "hiddenalpha:desk-cycle";

const DESK_LOCK_TTL_SECONDS =
  240;

async function saveDeskRunSafely(
  run: DeskRunRecord
) {
  try {
    await saveDeskRun(run);
  } catch (error) {
    console.error(
      "[HiddenAlpha] Failed to save desk run observability record",
      error
    );
  }
}

export async function runDeskCycle(
  input: TradingPipelineInput = {}
) {
  const startedAt =
    new Date().toISOString();

  const cycleStartedAt =
    performance.now();

  let lock:
    RuntimeLock | null =
    null;

  let lockDurationMs =
    0;

  let marketSyncDurationMs =
    0;

  let pipelineDurationMs =
    0;

  let marketSyncTotal:
    number | null =
    null;

  let marketSyncSuccess:
    number | null =
    null;

  let marketSyncFailed:
    number | null =
    null;

  let pipelineResult:
    unknown =
    null;

  try {
    /*
     * ========================================
     * STAGE 0 — DISTRIBUTED LOCK
     * ========================================
     */

    const lockStartedAt =
      performance.now();

    lock =
      await acquireRuntimeLock(
        DESK_LOCK_NAME,
        DESK_LOCK_TTL_SECONDS
      );

    lockDurationMs =
      performance.now() -
      lockStartedAt;

    /*
     * Another official desk cycle is already
     * running.
     *
     * Healthy skip, not an engine failure.
     */
    if (!lock.acquired) {
      const finishedAt =
        new Date().toISOString();

      const totalMs =
        Math.round(
          performance.now() -
            cycleStartedAt
        );

      await saveDeskRunSafely({
        startedAt,
        finishedAt,

        success:
          true,

        skipped:
          true,

        stage:
          "LOCKED",

        lockMs:
          lockDurationMs,

        marketSyncMs:
          0,

        pipelineMs:
          0,

        totalMs,

        marketSyncTotal:
          null,

        marketSyncSuccess:
          null,

        marketSyncFailed:
          null,

        pipelineResult:
          null,

        error:
          null,

        metadata: {
          lockName:
            DESK_LOCK_NAME,

          lockAcquired:
            false,

          source:
            "desk-cycle",
        },
      });

      return {
        success:
          true,

        skipped:
          true,

        stage:
          "LOCKED",

        timestamp:
          finishedAt,

        message:
          "Another HiddenAlpha desk cycle is already running.",

        marketSync:
          null,

        pipeline:
          null,

        lock: {
          acquired:
            false,

          name:
            DESK_LOCK_NAME,
        },

        timing: {
          lockMs:
            Math.round(
              lockDurationMs
            ),

          marketSyncMs:
            0,

          pipelineMs:
            0,

          totalMs,
        },
      };
    }

    /*
     * ========================================
     * STAGE 1 — MARKET SYNC
     * ========================================
     */

    const marketSyncStartedAt =
      performance.now();

    const marketSync =
      await syncBybitMarkets();

    marketSyncDurationMs =
      performance.now() -
      marketSyncStartedAt;

    const successfulSyncs =
      marketSync.filter(
        (item) =>
          item.success
      );

    const failedSyncs =
      marketSync.filter(
        (item) =>
          !item.success
      );

    marketSyncTotal =
      marketSync.length;

    marketSyncSuccess =
      successfulSyncs.length;

    marketSyncFailed =
      failedSyncs.length;

    /*
     * Do not publish against partially failed
     * market data.
     */
    if (
      failedSyncs.length >
      0
    ) {
      const finishedAt =
        new Date().toISOString();

      const totalMs =
        Math.round(
          performance.now() -
            cycleStartedAt
        );

      await saveDeskRunSafely({
        startedAt,
        finishedAt,

        success:
          false,

        skipped:
          false,

        stage:
          "MARKET_SYNC_FAILED",

        lockMs:
          lockDurationMs,

        marketSyncMs:
          marketSyncDurationMs,

        pipelineMs:
          0,

        totalMs,

        marketSyncTotal,

        marketSyncSuccess,

        marketSyncFailed,

        pipelineResult:
          null,

        error:
          "One or more market sync jobs failed.",

        metadata: {
          lockName:
            DESK_LOCK_NAME,

          lockAcquired:
            true,

          source:
            "desk-cycle",
        },
      });

      return {
        success:
          false,

        skipped:
          false,

        stage:
          "MARKET_SYNC_FAILED",

        timestamp:
          finishedAt,

        marketSync: {
          total:
            marketSyncTotal,

          success:
            marketSyncSuccess,

          failed:
            marketSyncFailed,

          results:
            marketSync,
        },

        pipeline:
          null,

        lock: {
          acquired:
            true,

          name:
            DESK_LOCK_NAME,
        },

        timing: {
          lockMs:
            Math.round(
              lockDurationMs
            ),

          marketSyncMs:
            Math.round(
              marketSyncDurationMs
            ),

          pipelineMs:
            0,

          totalMs,
        },
      };
    }

    /*
     * ========================================
     * STAGE 2 — TRADING PIPELINE
     * ========================================
     *
     * Lifecycle
     *    ↓
     * Scanner
     *    ↓
     * Publisher
     *    ↓
     * Persistent Signal
     */

    const pipelineStartedAt =
      performance.now();

    const pipeline =
      await runTradingPipeline(
        input
      );

    pipelineDurationMs =
      performance.now() -
      pipelineStartedAt;

    pipelineResult =
      pipeline;

    const finishedAt =
      new Date().toISOString();

    const totalMs =
      Math.round(
        performance.now() -
          cycleStartedAt
      );

    /*
     * ========================================
     * STAGE 3 — OBSERVABILITY
     * ========================================
     */

    await saveDeskRunSafely({
      startedAt,
      finishedAt,

      success:
        true,

      skipped:
        false,

      stage:
        "COMPLETED",

      lockMs:
        lockDurationMs,

      marketSyncMs:
        marketSyncDurationMs,

      pipelineMs:
        pipelineDurationMs,

      totalMs,

      marketSyncTotal,

      marketSyncSuccess,

      marketSyncFailed,

      pipelineResult,

      error:
        null,

      metadata: {
        lockName:
          DESK_LOCK_NAME,

        lockAcquired:
          true,

        source:
          "desk-cycle",
      },
    });

    return {
      success:
        true,

      skipped:
        false,

      stage:
        "COMPLETED",

      timestamp:
        finishedAt,

      marketSync: {
        total:
          marketSyncTotal,

        success:
          marketSyncSuccess,

        failed:
          marketSyncFailed,

        results:
          marketSync,
      },

      pipeline,

      lock: {
        acquired:
          true,

        name:
          DESK_LOCK_NAME,
      },

      timing: {
        lockMs:
          Math.round(
            lockDurationMs
          ),

        marketSyncMs:
          Math.round(
            marketSyncDurationMs
          ),

        pipelineMs:
          Math.round(
            pipelineDurationMs
          ),

        totalMs,
      },
    };
  } catch (
    error:
      unknown
  ) {
    const finishedAt =
      new Date().toISOString();

    const totalMs =
      Math.round(
        performance.now() -
          cycleStartedAt
      );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown desk cycle error";

    await saveDeskRunSafely({
      startedAt,
      finishedAt,

      success:
        false,

      skipped:
        false,

      stage:
        "DESK_CYCLE_ERROR",

      lockMs:
        lockDurationMs,

      marketSyncMs:
        marketSyncDurationMs,

      pipelineMs:
        pipelineDurationMs,

      totalMs,

      marketSyncTotal,

      marketSyncSuccess,

      marketSyncFailed,

      pipelineResult,

      error:
        errorMessage,

      metadata: {
        lockName:
          DESK_LOCK_NAME,

        lockAcquired:
          lock?.acquired ??
          false,

        source:
          "desk-cycle",
      },
    });

    return {
      success:
        false,

      skipped:
        false,

      stage:
        "DESK_CYCLE_ERROR",

      timestamp:
        finishedAt,

      error:
        errorMessage,

      marketSync:
        null,

      pipeline:
        null,

      lock: {
        acquired:
          lock?.acquired ??
          false,

        name:
          DESK_LOCK_NAME,
      },

      timing: {
        lockMs:
          Math.round(
            lockDurationMs
          ),

        marketSyncMs:
          Math.round(
            marketSyncDurationMs
          ),

        pipelineMs:
          Math.round(
            pipelineDurationMs
          ),

        totalMs,
      },
    };
  } finally {
    /*
     * ========================================
     * ALWAYS RELEASE OWNED LOCK
     * ========================================
     */

    if (
      lock?.acquired
    ) {
      try {
        await releaseRuntimeLock(
          lock
        );
      } catch (
        releaseError:
          unknown
      ) {
        console.error(
          "[HiddenAlpha] Failed to release desk runtime lock",
          releaseError
        );
      }
    }
  }
}