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

const DESK_LOCK_NAME =
  "hiddenalpha:desk-cycle";

const DESK_LOCK_TTL_SECONDS =
  240;

export async function runDeskCycle(
  input: TradingPipelineInput = {}
) {
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

  let result:
    Record<string, unknown>;

  try {
    /*
     * ========================================
     * STAGE 0 — DISTRIBUTED RUNTIME LOCK
     * ========================================
     *
     * Only one server instance may execute the
     * official HiddenAlpha desk cycle at once.
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
     * Another scheduler request already owns
     * the desk.
     *
     * This is a healthy skip, not an error.
     */
    if (!lock.acquired) {
      return {
        success: true,

        skipped: true,

        stage:
          "LOCKED",

        timestamp:
          new Date().toISOString(),

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

    const marketSyncSuccess =
      marketSync.filter(
        (item) =>
          item.success
      );

    const marketSyncFailed =
      marketSync.filter(
        (item) =>
          !item.success
      );

    /*
     * Never run lifecycle / publisher against
     * partially failed market data.
     */
    if (
      marketSyncFailed.length >
      0
    ) {
      result = {
        success:
          false,

        skipped:
          false,

        stage:
          "MARKET_SYNC_FAILED",

        timestamp:
          new Date().toISOString(),

        marketSync: {
          total:
            marketSync.length,

          success:
            marketSyncSuccess.length,

          failed:
            marketSyncFailed.length,

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

          totalMs:
            Math.round(
              performance.now() -
                cycleStartedAt
            ),
        },
      };

      return result;
    }

    /*
     * ========================================
     * STAGE 2 — OFFICIAL TRADING PIPELINE
     * ========================================
     *
     * Lifecycle
     *    ↓
     * Scanner
     *    ↓
     * Publisher
     *    ↓
     * Persistent signal
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

    result = {
      success:
        true,

      skipped:
        false,

      stage:
        "COMPLETED",

      timestamp:
        new Date().toISOString(),

      marketSync: {
        total:
          marketSync.length,

        success:
          marketSyncSuccess.length,

        failed:
          0,

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

        totalMs:
          Math.round(
            performance.now() -
              cycleStartedAt
          ),
      },
    };

    return result;
  } catch (
    error:
      unknown
  ) {
    return {
      success:
        false,

      skipped:
        false,

      stage:
        "DESK_CYCLE_ERROR",

      timestamp:
        new Date().toISOString(),

      error:
        error instanceof Error
          ? error.message
          : "Unknown desk cycle error",

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

        totalMs:
          Math.round(
            performance.now() -
              cycleStartedAt
          ),
      },
    };
  } finally {
    /*
     * ========================================
     * ALWAYS RELEASE OWNED LOCK
     * ========================================
     *
     * Only the UUID owner can release it.
     *
     * If release itself fails, the PostgreSQL
     * TTL will still recover the lock.
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