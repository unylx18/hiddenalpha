import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type EngineHealthStatus =
  | "OPERATIONAL"
  | "DEGRADED"
  | "DOWN";

export type EngineHealthSummary = {
  timestamp: string;

  status:
    EngineHealthStatus;

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

type DeskRunRow = {
  started_at:
    string;

  finished_at:
    string | null;

  success:
    boolean;

  skipped:
    boolean;

  stage:
    string;

  total_ms:
    number | null;
};

function round(
  value: number,
  decimals = 2
) {
  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      value *
        multiplier
    ) /
    multiplier
  );
}

export async function getEngineHealthSummary(): Promise<EngineHealthSummary> {
  const supabase =
    createAdminClient();

  const now =
    new Date();

  const twentyFourHoursAgo =
    new Date(
      now.getTime() -
        24 *
          60 *
          60 *
          1000
    ).toISOString();

  const oneHourAgo =
    new Date(
      now.getTime() -
        60 *
          60 *
          1000
    );

  /*
   * ========================================
   * LATEST RUN
   * ========================================
   */

  const {
    data:
      latestRunData,

    error:
      latestRunError,
  } =
    await supabase
      .from(
        "hiddenalpha_desk_runs"
      )
      .select(
        `
        started_at,
        finished_at,
        success,
        skipped,
        stage,
        total_ms
        `
      )
      .order(
        "started_at",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (
    latestRunError
  ) {
    throw new Error(
      `Failed to load latest HiddenAlpha desk run: ${latestRunError.message}`
    );
  }

  /*
   * ========================================
   * LATEST COMPLETED RUN
   * ========================================
   */

  const {
    data:
      latestCompletedData,

    error:
      latestCompletedError,
  } =
    await supabase
      .from(
        "hiddenalpha_desk_runs"
      )
      .select(
        `
        started_at,
        finished_at,
        success,
        skipped,
        stage,
        total_ms
        `
      )
      .eq(
        "stage",
        "COMPLETED"
      )
      .eq(
        "success",
        true
      )
      .order(
        "started_at",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (
    latestCompletedError
  ) {
    throw new Error(
      `Failed to load latest completed HiddenAlpha desk run: ${latestCompletedError.message}`
    );
  }

  /*
   * ========================================
   * LAST 24 HOURS
   * ========================================
   */

  const {
    data:
      runData,

    error:
      runError,
  } =
    await supabase
      .from(
        "hiddenalpha_desk_runs"
      )
      .select(
        `
        started_at,
        finished_at,
        success,
        skipped,
        stage,
        total_ms
        `
      )
      .gte(
        "started_at",
        twentyFourHoursAgo
      )
      .order(
        "started_at",
        {
          ascending:
            false,
        }
      );

  if (runError) {
    throw new Error(
      `Failed to load HiddenAlpha desk health history: ${runError.message}`
    );
  }

  const runs =
    (runData ??
      []) as DeskRunRow[];

  const runs24h =
    runs.length;

  const completedRuns =
    runs.filter(
      (run) =>
        run.stage ===
          "COMPLETED" &&
        run.success
    );

  const lockedRuns =
    runs.filter(
      (run) =>
        run.stage ===
        "LOCKED"
    );

  const failedRuns =
    runs.filter(
      (run) =>
        !run.success
    );

  const recentFailures =
    failedRuns.filter(
      (run) =>
        new Date(
          run.started_at
        ).getTime() >=
        oneHourAgo.getTime()
    );

  /*
   * LOCKED is considered healthy.
   *
   * It means another official desk cycle
   * already owned the distributed lock.
   */
  const successfulRuns =
    runs.filter(
      (run) =>
        run.success
    );

  const successRate24h =
    runs24h > 0
      ? round(
          (
            successfulRuns.length /
            runs24h
          ) *
            100
        )
      : 0;

  /*
   * Runtime average only uses actual
   * COMPLETED engine cycles.
   *
   * LOCKED requests are intentionally
   * excluded because they finish quickly
   * and would distort engine runtime.
   */
  const completedRuntimeValues =
    completedRuns
      .map(
        (run) =>
          Number(
            run.total_ms ??
              0
          )
      )
      .filter(
        (value) =>
          Number.isFinite(
            value
          ) &&
          value > 0
      );

  const averageRuntimeMs24h =
    completedRuntimeValues.length >
    0
      ? round(
          completedRuntimeValues.reduce(
            (
              total,
              value
            ) =>
              total +
              value,
            0
          ) /
            completedRuntimeValues.length,
          0
        )
      : 0;

  const averageRuntimeSeconds24h =
    round(
      averageRuntimeMs24h /
        1000
    );

  /*
   * ========================================
   * LAST COMPLETED AGE
   * ========================================
   */

  const lastCompletedAt =
    latestCompletedData?.finished_at ??
    latestCompletedData?.started_at ??
    null;

  const minutesSinceLastCompleted =
    lastCompletedAt
      ? round(
          (
            now.getTime() -
            new Date(
              lastCompletedAt
            ).getTime()
          ) /
            60_000
        )
      : null;

  /*
   * ========================================
   * HEALTH DECISION
   * ========================================
   *
   * Scheduler target is every 5 minutes.
   *
   * OPERATIONAL
   * - completed recently
   * - no failures during the last hour
   *
   * DEGRADED
   * - completed cycle becoming stale
   * - OR recent failures exist
   *
   * DOWN
   * - no successful completed cycle
   * - OR last completed cycle > 20 min ago
   */

  let status:
    EngineHealthStatus =
      "OPERATIONAL";

  if (
    minutesSinceLastCompleted ===
      null ||
    minutesSinceLastCompleted >
      20
  ) {
    status =
      "DOWN";
  } else if (
    minutesSinceLastCompleted >
      10 ||
    recentFailures.length >
      0
  ) {
    status =
      "DEGRADED";
  }

  return {
    timestamp:
      now.toISOString(),

    status,

    lastRunAt:
      latestRunData?.started_at ??
      null,

    lastCompletedAt,

    minutesSinceLastCompleted,

    runs24h,

    completed24h:
      completedRuns.length,

    locked24h:
      lockedRuns.length,

    failed24h:
      failedRuns.length,

    recentFailures1h:
      recentFailures.length,

    successRate24h,

    averageRuntimeMs24h,

    averageRuntimeSeconds24h,
  };
}