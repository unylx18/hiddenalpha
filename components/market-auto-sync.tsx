"use client";

import { useEffect } from "react";

const SYNC_INTERVAL_MS = 60_000;

const STARTUP_RETRY_MS = 5_000;

const MAX_STARTUP_RETRIES = 3;

const MIN_TRIGGER_GAP_MS = 5_000;

export const MARKET_SYNC_COMPLETE_EVENT =
  "hiddenalpha:market-sync-complete";

export const MARKET_SYNC_START_EVENT =
  "hiddenalpha:market-sync-start";

/*
 * Kept for backwards compatibility.
 *
 * Browser-side trading pipeline execution has been disabled.
 * The official lifecycle + publisher pipeline is now executed
 * only by the secure server scheduler.
 */
export const SIGNAL_PIPELINE_COMPLETE_EVENT =
  "hiddenalpha:signal-pipeline-complete";

export const SIGNAL_PIPELINE_START_EVENT =
  "hiddenalpha:signal-pipeline-start";

let activeCycle: Promise<boolean> | null =
  null;

let lastCycleStartedAt = 0;

type CycleReason =
  | "startup"
  | "interval"
  | "visibility"
  | "focus"
  | "pageshow"
  | "online"
  | "startup-retry";

type CycleOptions = {
  reason: CycleReason;
  force?: boolean;
};

type ApiResult = {
  success?: boolean;
  [key: string]: unknown;
};

async function readJsonSafe(
  response: Response
): Promise<ApiResult | null> {
  try {
    return (await response.json()) as ApiResult;
  } catch {
    return null;
  }
}

async function executeMarketSyncCycle(
  reason: CycleReason
): Promise<boolean> {
  const cycleStartedAt =
    performance.now();

  console.info(
    `[HiddenAlpha] Browser market sync started: ${reason}`
  );

  window.dispatchEvent(
    new CustomEvent(
      MARKET_SYNC_START_EVENT,
      {
        detail: {
          reason,
          source: "browser",
          timestamp:
            new Date().toISOString(),
        },
      }
    )
  );

  document.documentElement.dataset.marketSyncReady =
    "syncing";

  /*
   * Trading pipeline state is now server-managed.
   *
   * The browser must never call:
   *
   * /api/trading/pipeline
   *
   * because publishing official signals from both
   * browser and scheduler could create race conditions.
   */
  document.documentElement.dataset.signalPipelineReady =
    "server-managed";

  const syncStartedAt =
    performance.now();

  const syncResponse =
    await fetch(
      "/api/market/sync",
      {
        method: "POST",

        cache: "no-store",

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
      "[HiddenAlpha] Browser market sync failed",
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

          source:
            "browser",

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

  const cycleDurationMs =
    performance.now() -
    cycleStartedAt;

  console.info(
    `[HiddenAlpha] Browser market sync completed in ${(syncDurationMs / 1000).toFixed(
      2
    )}s`
  );

  console.info(
    `[HiddenAlpha] Browser refresh cycle finished in ${(cycleDurationMs / 1000).toFixed(
      2
    )}s`
  );

  return true;
}

function runSharedMarketSync({
  reason,
  force = false,
}: CycleOptions): Promise<boolean> {
  /*
   * Do not perform browser background work
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
   * Reuse an already-running sync instead of
   * creating overlapping browser requests.
   */
  if (activeCycle) {
    console.info(
      `[HiddenAlpha] Browser market sync skipped (${reason}) — another sync is already running`
    );

    return activeCycle;
  }

  const now =
    Date.now();

  /*
   * Visibility, focus and pageshow can fire
   * almost simultaneously.
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
    executeMarketSyncCycle(
      reason
    )
      .catch(
        (
          error:
            unknown
        ) => {
          console.warn(
            "[HiddenAlpha] Browser market sync error",
            error
          );

          document.documentElement.dataset.marketSyncReady =
            "error";

          document.documentElement.dataset.signalPipelineReady =
            "server-managed";

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
     * STARTUP MARKET REFRESH
     * ========================================
     *
     * Browser responsibility:
     *
     * 1. Refresh market candles
     * 2. Notify dashboard components
     *
     * Trading pipeline is intentionally NOT
     * executed here.
     */
    async function runStartup(
      attempt = 0
    ) {
      if (cancelled) {
        return;
      }

      const success =
        await runSharedMarketSync({
          reason:
            attempt === 0
              ? "startup"
              : "startup-retry",

          force: true,
        });

      if (
        cancelled ||
        success
      ) {
        return;
      }

      if (
        attempt <
        MAX_STARTUP_RETRIES
      ) {
        console.warn(
          `[HiddenAlpha] Startup market sync failed. Retrying in ${
            STARTUP_RETRY_MS /
            1000
          }s...`
        );

        retryTimer =
          window.setTimeout(
            () => {
              void runStartup(
                attempt + 1
              );
            },
            STARTUP_RETRY_MS
          );
      }
    }

    document.documentElement.dataset.signalPipelineReady =
      "server-managed";

    void runStartup();

    /*
     * ========================================
     * 60 SECOND BROWSER MARKET REFRESH
     * ========================================
     */
    const interval =
      window.setInterval(
        () => {
          void runSharedMarketSync({
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
        void runSharedMarketSync({
          reason:
            "visibility",
        });
      }
    }

    function handleFocus() {
      void runSharedMarketSync({
        reason:
          "focus",
      });
    }

    function handlePageShow() {
      void runSharedMarketSync({
        reason:
          "pageshow",
      });
    }

    function handleOnline() {
      void runSharedMarketSync({
        reason:
          "online",

        force: true,
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