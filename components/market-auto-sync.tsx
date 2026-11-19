"use client";

import { useEffect } from "react";

// Legacy event names are preserved for dashboard components.
export const MARKET_SYNC_COMPLETE_EVENT = "hiddenalpha:market-sync-complete";
export const MARKET_SYNC_START_EVENT = "hiddenalpha:market-sync-start";
export const SIGNAL_PIPELINE_COMPLETE_EVENT = "hiddenalpha:signal-pipeline-complete";
export const SIGNAL_PIPELINE_START_EVENT = "hiddenalpha:signal-pipeline-start";

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Browser may refresh read-only market views, but MUST NOT initiate privileged
 * ingestion or publishing. The server desk cycle owns both operations.
 */
export default function MarketAutoSync() {
  useEffect(() => {
    let closed = false;
    let inFlight = false;

    document.documentElement.dataset.signalPipelineReady = "server-managed";
    document.documentElement.dataset.marketSyncReady = "server-managed";

    async function refreshViews() {
      if (closed || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        window.dispatchEvent(new CustomEvent(MARKET_SYNC_START_EVENT, {
          detail: { source: "browser-read-only", timestamp: new Date().toISOString() },
        }));

        const response = await fetch("/api/trading/health", { cache: "no-store" });
        if (!response.ok) throw new Error("Engine health request failed");
        const data = await response.json();

        if (!data.success || !data.health ||
            data.health.status !== "OPERATIONAL") {
          document.documentElement.dataset.marketSyncReady = "error";
          return;
        }

        document.documentElement.dataset.marketSyncReady = "true";
        if (!closed) {
          // Consumers can re-fetch market data; this event never implies a DB write.
          window.dispatchEvent(new CustomEvent(MARKET_SYNC_COMPLETE_EVENT, {
            detail: { source: "browser-read-only", timestamp: new Date().toISOString() },
          }));
        }
      } catch {
        document.documentElement.dataset.marketSyncReady = "error";
      } finally {
        inFlight = false;
      }
    }

    void refreshViews();
    const timer = window.setInterval(() => void refreshViews(), REFRESH_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void refreshViews(); };
    const onFocus = () => void refreshViews();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      closed = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
