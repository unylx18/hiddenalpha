import { timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-only authorization for endpoints that mutate shared market/signal data.
 * A cron token is for trusted automation; the optional user allowlist is for
 * explicit administrators. Neither an ordinary login nor public signup grants
 * write privileges. Missing configuration fails closed.
 */
export async function authorizeMutation(request: Request): Promise<Response | null> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (secret && header?.startsWith("Bearer ")) {
    const received = Buffer.from(header.slice("Bearer ".length), "utf8");
    const expected = Buffer.from(secret, "utf8");

    if (received.length === expected.length &&
        timingSafeEqual(received, expected)) {
      return null;
    }
  }

  const adminIds = new Set(
    (process.env.HIDDENALPHA_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );

  if (adminIds.size > 0) {
    try {
      const client = await createClient();
      const { data, error } = await client.auth.getUser();

      if (!error && data.user && adminIds.has(data.user.id)) {
        return null;
      }
    } catch {
      // Fail closed if auth is temporarily unavailable.
    }
  }

  return Response.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}
