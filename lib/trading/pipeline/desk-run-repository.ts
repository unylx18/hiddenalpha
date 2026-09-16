import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type DeskRunStage =
  | "COMPLETED"
  | "LOCKED"
  | "MARKET_SYNC_FAILED"
  | "DESK_CYCLE_ERROR";

export type DeskRunRecord = {
  startedAt: string;

  finishedAt:
    string;

  success:
    boolean;

  skipped:
    boolean;

  stage:
    DeskRunStage;

  lockMs?:
    number;

  marketSyncMs?:
    number;

  pipelineMs?:
    number;

  totalMs?:
    number;

  marketSyncTotal?:
    number | null;

  marketSyncSuccess?:
    number | null;

  marketSyncFailed?:
    number | null;

  pipelineResult?:
    unknown;

  error?:
    string | null;

  metadata?:
    Record<string, unknown>;
};

export async function saveDeskRun(
  run: DeskRunRecord
) {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "hiddenalpha_desk_runs"
      )
      .insert({
        started_at:
          run.startedAt,

        finished_at:
          run.finishedAt,

        success:
          run.success,

        skipped:
          run.skipped,

        stage:
          run.stage,

        lock_ms:
          Math.max(
            0,
            Math.round(
              run.lockMs ?? 0
            )
          ),

        market_sync_ms:
          Math.max(
            0,
            Math.round(
              run.marketSyncMs ?? 0
            )
          ),

        pipeline_ms:
          Math.max(
            0,
            Math.round(
              run.pipelineMs ?? 0
            )
          ),

        total_ms:
          Math.max(
            0,
            Math.round(
              run.totalMs ?? 0
            )
          ),

        market_sync_total:
          run.marketSyncTotal ??
          null,

        market_sync_success:
          run.marketSyncSuccess ??
          null,

        market_sync_failed:
          run.marketSyncFailed ??
          null,

        pipeline_result:
          run.pipelineResult ??
          null,

        error:
          run.error ??
          null,

        metadata:
          run.metadata ?? {},
      })
      .select()
      .single();

  if (error) {
    throw new Error(
      `Failed to save HiddenAlpha desk run: ${error.message}`
    );
  }

  return data;
}