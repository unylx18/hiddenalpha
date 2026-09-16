import {
  NextResponse,
} from "next/server";

import {
  monitorActiveSignals,
} from "@/lib/trading/signal/lifecycle-monitor-service";

export async function POST() {
  try {
    const result =
      await monitorActiveSignals();

    return NextResponse.json({
      success: true,

      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}