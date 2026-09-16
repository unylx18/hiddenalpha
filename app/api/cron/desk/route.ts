import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runDeskCycle,
} from "@/lib/trading/pipeline/desk-cycle-service";

const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

function isAuthorized(
  request: NextRequest
) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    return {
      ok: false,
      reason:
        "CRON_SECRET is not configured",
      status: 500,
    };
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  const expected =
    `Bearer ${cronSecret}`;

  if (
    authorization !==
    expected
  ) {
    return {
      ok: false,
      reason:
        "Unauthorized",
      status: 401,
    };
  }

  return {
    ok: true,
    reason: null,
    status: 200,
  };
}

async function handleDeskCron(
  request: NextRequest
) {
  const auth =
    isAuthorized(
      request
    );

  if (!auth.ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          auth.reason,
      },
      {
        status:
          auth.status,
      }
    );
  }

  const startedAt =
    performance.now();

  try {
    /*
     * ========================================
     * SERVER-SIDE HIDDENALPHA DESK CYCLE
     * ========================================
     *
     * 1. Sync market candles
     * 2. Lifecycle monitor
     * 3. Scanner / Publisher
     * 4. Active signal snapshot
     */

    const result =
      await runDeskCycle({
        symbols:
          DEFAULT_SYMBOLS,

        accountBalance:
          10000,

        riskPercent:
          1,

        leverage:
          1,
      });

    const durationMs =
      Math.round(
        performance.now() -
          startedAt
      );

    /*
     * Market sync safety gate failed.
     */

    if (
      !result.success
    ) {
      return NextResponse.json(
        {
          success: false,

          source:
            "cron",

          timestamp:
            new Date().toISOString(),

          durationMs,

          result,
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json({
      success: true,

      source:
        "cron",

      timestamp:
        new Date().toISOString(),

      durationMs,

      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        source:
          "cron",

        timestamp:
          new Date().toISOString(),

        error:
          error instanceof Error
            ? error.message
            : String(
                error
              ),
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * Vercel Cron uses GET.
 */

export async function GET(
  request: NextRequest
) {
  return handleDeskCron(
    request
  );
}

/*
 * POST is useful for authenticated
 * localhost/manual testing.
 */

export async function POST(
  request: NextRequest
) {
  return handleDeskCron(
    request
  );
}