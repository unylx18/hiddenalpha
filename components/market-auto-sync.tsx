"use client";

import {
  useEffect,
} from "react";

const SYNC_INTERVAL_MS =
  60_000;

const STARTUP_RETRY_MS =
  5_000;

const MAX_STARTUP_RETRIES =
  3;

const MIN_TRIGGER_GAP_MS =
  5_000;

export const MARKET_SYNC_COMPLETE_EVENT =
  "hiddenalpha:market-sync-complete";

export const MARKET_SYNC_START_EVENT =
  "hiddenalpha:market-sync-start";

export const SIGNAL_PIPELINE_COMPLETE_EVENT =
  "hiddenalpha:signal-pipeline-complete";

export const SIGNAL_PIPELINE_START_EVENT =
  "hiddenalpha:signal-pipeline-start";

/*
 * ========================================
 * MODULE LEVEL DESK STATE
 * ========================================
 *
 * HiddenAlphaShell may remount when navigating
 * between pages.
 *
 * Keeping these outside the component prevents
 * multiple overlapping desk cycles.
 */

let activeCycle:
  Promise<boolean> | null =
    null;

let lastCycleStartedAt =
  0;

type CycleReason =
  | "startup"
  | "interval"
  | "visibility"
  | "focus"
  | "pageshow"
  | "online"
  | "startup-retry";

type CycleOptions = {
  reason:
    CycleReason;

  force?: boolean;
};

async function readJsonSafe(
  response: Response
): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function executeDeskCycle(
  reason: CycleReason
): Promise<boolean> {
  const cycleStartedAt =
    performance.now();

  console.info(
    `[HiddenAlpha] Desk cycle started: ${reason}`
  );

  /*
   * ========================================
   * STAGE 1 — MARKET SYNC
   * ========================================
   */

  window.dispatchEvent(
    new CustomEvent(
      MARKET_SYNC_START_EVENT,
      {
        detail: {
          reason,

          timestamp:
            new Date().toISOString(),
        },
      }
    )
  );

  document.documentElement.dataset.marketSyncReady =
    "syncing";

  const syncStartedAt =
    performance.now();

  const syncResponse =
    await fetch(
      "/api/market/sync",
      {
        method: "POST",

        cache:
          "no-store",

        headers: {
          "Cache-Control":
            "no-cache",
        },
      }
    );

  const syncData =
    await readJsonSafe(
      syncResponse
    );

  if (
    !syncResponse.ok ||
    !syncData?.success
  ) {
    document.documentElement.dataset.marketSyncReady =
      "error";

    console.warn(
      "[HiddenAlpha] Market sync failed",
      {
        reason,
        status:
          syncResponse.status,
        result:
          syncData,
      }
    );

    return false;
  }

  const syncDurationMs =
    performance.now() -
    syncStartedAt;

  document.documentElement.dataset.marketSyncReady =
    "true";

  window.dispatchEvent(
    new CustomEvent(
      MARKET_SYNC_COMPLETE_EVENT,
      {
        detail: {
          reason,

          timestamp:
            new Date().toISOString(),

          durationMs:
            syncDurationMs,

          result:
            syncData,
        },
      }
    )
  );

  console.info(
    `[HiddenAlpha] Market sync completed in ${(syncDurationMs / 1000).toFixed(
      2
    )}s`
  );

  /*
   * ========================================
   * STAGE 2 — TRADING PIPELINE
   * ========================================
   *
   * Only run after market sync succeeds.
   *
   * Lifecycle
   *    ↓
   * Scanner
   *    ↓
   * Publisher
   *    ↓
   * Persistent Active Signal
   */

  window.dispatchEvent(
    new CustomEvent(
      SIGNAL_PIPELINE_START_EVENT,
      {
        detail: {
          reason,

          timestamp:
            new Date().toISOString(),
        },
      }
    )
  );

  document.documentElement.dataset.signalPipelineReady =
    "processing";

  const pipelineStartedAt =
    performance.now();

  const pipelineResponse =
    await fetch(
      "/api/trading/pipeline",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Cache-Control":
            "no-cache",
        },

        body:
          JSON.stringify({
            accountBalance:
              10000,

            riskPercent:
              1,

            leverage:
              1,

            symbols: [
              "BTCUSDT",
              "ETHUSDT",
              "SOLUSDT",
            ],
          }),

        cache:
          "no-store",
      }
    );

  const pipelineData =
    await readJsonSafe(
      pipelineResponse
    );

  if (
    !pipelineResponse.ok ||
    !pipelineData?.success
  ) {
    document.documentElement.dataset.signalPipelineReady =
      "error";

    console.warn(
      "[HiddenAlpha] Signal pipeline failed",
      {
        reason,
        status:
          pipelineResponse.status,
        result:
          pipelineData,
      }
    );

    return false;
  }

  const pipelineDurationMs =
    performance.now() -
    pipelineStartedAt;

  document.documentElement.dataset.signalPipelineReady =
    "true";

  window.dispatchEvent(
    new CustomEvent(
      SIGNAL_PIPELINE_COMPLETE_EVENT,
      {
        detail: {
          reason,

          timestamp:
            new Date().toISOString(),

          durationMs:
            pipelineDurationMs,

          result:
            pipelineData,
        },
      }
    )
  );

  const cycleDurationMs =
    performance.now() -
    cycleStartedAt;

  console.info(
    `[HiddenAlpha] Signal pipeline completed in ${(pipelineDurationMs / 1000).toFixed(
      2
    )}s`
  );

  console.info(
    `[HiddenAlpha] Desk cycle finished in ${(cycleDurationMs / 1000).toFixed(
      2
    )}s`
  );

  return true;
}

function runSharedDeskCycle({
  reason,
  force = false,
}: CycleOptions): Promise<boolean> {
  /*
   * Do not perform background browser work
   * unless explicitly forced.
   */

  if (
    !force &&
    document.visibilityState !==
      "visible"
  ) {
    return Promise.resolve(
      false
    );
  }

  /*
   * A cycle is already running.
   *
   * Reuse the same promise instead of
   * starting another Market Sync + Pipeline.
   */

  if (
    activeCycle
  ) {
    console.info(
      `[HiddenAlpha] Desk cycle skipped (${reason}) — another cycle is already running`
    );

    return activeCycle;
  }

  const now =
    Date.now();

  /*
   * Focus + visibility + pageshow can fire
   * almost simultaneously.
   *
   * Avoid running the entire engine several
   * times within a few seconds.
   */

  if (
    !force &&
    now -
      lastCycleStartedAt <
      MIN_TRIGGER_GAP_MS
  ) {
    return Promise.resolve(
      false
    );
  }

  lastCycleStartedAt =
    now;

  activeCycle =
    executeDeskCycle(
      reason
    )
      .catch(
        (
          error:
            unknown
        ) => {
          console.warn(
            "[HiddenAlpha] Desk cycle error",
            error
          );

          document.documentElement.dataset.marketSyncReady =
            "error";

          document.documentElement.dataset.signalPipelineReady =
            "error";

          return false;
        }
      )
      .finally(() => {
        activeCycle =
          null;
      });

  return activeCycle;
}

export default function MarketAutoSync() {
  useEffect(() => {
    let cancelled =
      false;

    let retryTimer:
      number | null =
        null;

    /*
     * ========================================
     * STARTUP SYNC
     * ========================================
     *
     * Every time HiddenAlpha boots:
     *
     * 1. Sync fresh market candles
     * 2. Run trading pipeline
     * 3. Notify all dashboard components
     *
     * Startup is forced even if the browser
     * visibility state has not settled yet.
     */

    async function runStartup(
      attempt = 0
    ) {
      if (
        cancelled
      ) {
        return;
      }

      const success =
        await runSharedDeskCycle({
          reason:
            attempt ===
            0
              ? "startup"
              : "startup-retry",

          force:
            true,
        });

      if (
        cancelled ||
        success
      ) {
        return;
      }

      /*
       * Dev server / API routes can still be
       * warming up during the first browser
       * request.
       *
       * Retry automatically instead of leaving
       * the desk stale for a full minute.
       */

      if (
        attempt <
        MAX_STARTUP_RETRIES
      ) {
        console.warn(
          `[HiddenAlpha] Startup cycle failed. Retrying in ${
            STARTUP_RETRY_MS /
            1000
          }s...`
        );

        retryTimer =
          window.setTimeout(
            () => {
              void runStartup(
                attempt +
                  1
              );
            },
            STARTUP_RETRY_MS
          );
      }
    }

    void runStartup();

    /*
     * ========================================
     * 60 SECOND DESK LOOP
     * ========================================
     */

    const interval =
      window.setInterval(
        () => {
          void runSharedDeskCycle({
            reason:
              "interval",
          });
        },
        SYNC_INTERVAL_MS
      );

    /*
     * ========================================
     * USER RETURNS TO TAB
     * ========================================
     */

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void runSharedDeskCycle({
          reason:
            "visibility",
        });
      }
    }

    /*
     * Window focus gives another recovery
     * mechanism after laptop sleep or when
     * returning from another application.
     */

    function handleFocus() {
      void runSharedDeskCycle({
        reason:
          "focus",
      });
    }

    /*
     * Handles browser back-forward cache.
     */

    function handlePageShow() {
      void runSharedDeskCycle({
        reason:
          "pageshow",
      });
    }

    /*
     * If internet disappears and comes back,
     * immediately refresh market intelligence.
     */

    function handleOnline() {
      void runSharedDeskCycle({
        reason:
          "online",

        force:
          true,
      });
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    window.addEventListener(
      "pageshow",
      handlePageShow
    );

    window.addEventListener(
      "online",
      handleOnline
    );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        interval
      );

      if (
        retryTimer !==
        null
      ) {
        window.clearTimeout(
          retryTimer
        );
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow
      );

      window.removeEventListener(
        "online",
        handleOnline
      );
    };
  }, []);

  return null;
}