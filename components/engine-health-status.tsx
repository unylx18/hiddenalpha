"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type EngineStatus =
  | "OPERATIONAL"
  | "DEGRADED"
  | "DOWN";

type EngineHealth = {
  timestamp: string;

  status:
    EngineStatus;

  lastRunAt:
    string | null;

  lastCompletedAt:
    string | null;

  minutesSinceLastCompleted:
    number | null;

  runs24h:
    number;

  completed24h:
    number;

  locked24h:
    number;

  failed24h:
    number;

  recentFailures1h:
    number;

  successRate24h:
    number;

  averageRuntimeMs24h:
    number;

  averageRuntimeSeconds24h:
    number;
};

type HealthResponse = {
  success: boolean;

  health?:
    EngineHealth;

  error?:
    string;
};

const REFRESH_INTERVAL_MS =
  30_000;

function getStatusLabel(
  status:
    EngineStatus | "CHECKING"
) {
  switch (status) {
    case "OPERATIONAL":
      return "Operational";

    case "DEGRADED":
      return "Degraded";

    case "DOWN":
      return "Down";

    default:
      return "Checking";
  }
}

function getStatusColor(
  status:
    EngineStatus | "CHECKING"
) {
  switch (status) {
    case "OPERATIONAL":
      return {
        dot:
          "bg-emerald-400",

        text:
          "text-emerald-400",
      };

    case "DEGRADED":
      return {
        dot:
          "bg-amber-400",

        text:
          "text-amber-400",
      };

    case "DOWN":
      return {
        dot:
          "bg-red-400",

        text:
          "text-red-400",
      };

    default:
      return {
        dot:
          "bg-zinc-500",

        text:
          "text-zinc-500",
      };
  }
}

export default function EngineHealthStatus() {
  const [
    health,
    setHealth,
  ] =
    useState<EngineHealth | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    requestFailed,
    setRequestFailed,
  ] =
    useState(false);

  const loadHealth =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/trading/health",
            {
              cache:
                "no-store",

              headers: {
                "Cache-Control":
                  "no-cache",
              },
            }
          );

        const data =
          (await response.json()) as HealthResponse;

        if (
          !response.ok ||
          !data.success ||
          !data.health
        ) {
          throw new Error(
            data.error ??
              "Failed to load engine health"
          );
        }

        setHealth(
          data.health
        );

        setRequestFailed(
          false
        );
      } catch (
        error:
          unknown
      ) {
        console.warn(
          "[HiddenAlpha] Engine health request failed",
          error
        );

        setRequestFailed(
          true
        );
      } finally {
        setLoading(
          false
        );
      }
    }, []);

  useEffect(() => {
    void loadHealth();

    const interval =
      window.setInterval(
        () => {
          void loadHealth();
        },
        REFRESH_INTERVAL_MS
      );

    function handleFocus() {
      void loadHealth();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void loadHealth();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [
    loadHealth,
  ]);

  const status:
    EngineStatus | "CHECKING" =
      requestFailed
        ? "DOWN"
        : health?.status ??
          "CHECKING";

  const colors =
    getStatusColor(
      status
    );

  const label =
    loading &&
    !health
      ? "Checking"
      : requestFailed
      ? "Unavailable"
      : getStatusLabel(
          status
        );

  const title =
    health
      ? [
          `Status: ${health.status}`,
          `Success 24h: ${health.successRate24h}%`,
          `Completed: ${health.completed24h}`,
          `Failed: ${health.failed24h}`,
          `Avg runtime: ${health.averageRuntimeSeconds24h}s`,
        ].join("\n")
      : "HiddenAlpha engine health";

  return (
    <div
      title={title}
      className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.055] bg-[#0a0d13] px-3"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${colors.dot}`}
      />

      <div className="hidden sm:block">
        <p className="text-[8px] text-zinc-400">
          HiddenAlpha
        </p>

        <p
          className={`text-[7px] ${colors.text}`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}