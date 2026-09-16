import { randomUUID } from "node:crypto";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

const DEFAULT_LOCK_TTL_SECONDS = 240;

export type RuntimeLock = {
  name: string;
  ownerId: string;
  acquired: boolean;
};

export async function acquireRuntimeLock(
  name: string,
  ttlSeconds = DEFAULT_LOCK_TTL_SECONDS
): Promise<RuntimeLock> {
  const normalizedName =
    name.trim();

  if (!normalizedName) {
    throw new Error(
      "Runtime lock name is required"
    );
  }

  if (
    !Number.isInteger(ttlSeconds) ||
    ttlSeconds < 30 ||
    ttlSeconds > 600
  ) {
    throw new Error(
      "Runtime lock TTL must be between 30 and 600 seconds"
    );
  }

  const ownerId =
    randomUUID();

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "acquire_hiddenalpha_runtime_lock",
      {
        p_name:
          normalizedName,

        p_owner_id:
          ownerId,

        p_ttl_seconds:
          ttlSeconds,
      }
    );

  if (error) {
    throw new Error(
      `Failed to acquire runtime lock: ${error.message}`
    );
  }

  return {
    name:
      normalizedName,

    ownerId,

    acquired:
      data === true,
  };
}

export async function releaseRuntimeLock(
  lock: RuntimeLock
): Promise<boolean> {
  if (!lock.acquired) {
    return false;
  }

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "release_hiddenalpha_runtime_lock",
      {
        p_name:
          lock.name,

        p_owner_id:
          lock.ownerId,
      }
    );

  if (error) {
    throw new Error(
      `Failed to release runtime lock: ${error.message}`
    );
  }

  return data === true;
}