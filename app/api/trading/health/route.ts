import {
  NextResponse,
} from "next/server";

import {
  getEngineHealthSummary,
} from "@/lib/trading/pipeline/engine-health-service";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const health =
      await getEngineHealthSummary();

    return NextResponse.json({
      success:
        true,

      health,
    });
  } catch (
    error:
      unknown
  ) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to load HiddenAlpha engine health",
      },
      {
        status:
          500,
      }
    );
  }
}