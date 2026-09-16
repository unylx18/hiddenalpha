import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runTradingPipeline,
} from "@/lib/trading/pipeline/service";

export async function POST(
  request: NextRequest
) {
  try {
    let body: Record<
      string,
      unknown
    > = {};

    try {
      body =
        (await request.json()) as Record<
          string,
          unknown
        >;
    } catch {
      body = {};
    }

    const accountBalance =
      Number(
        body.accountBalance ??
          10000
      );

    const riskPercent =
      Number(
        body.riskPercent ??
          1
      );

    const leverage =
      Number(
        body.leverage ??
          1
      );

    const symbols =
      Array.isArray(
        body.symbols
      )
        ? body.symbols
            .map(
              (
                symbol
              ) =>
                String(
                  symbol
                )
                  .trim()
                  .toUpperCase()
            )
            .filter(
              Boolean
            )
        : undefined;

    /*
     * ========================================
     * INPUT VALIDATION
     * ========================================
     */

    if (
      !Number.isFinite(
        accountBalance
      ) ||
      accountBalance <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid accountBalance",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        riskPercent
      ) ||
      riskPercent <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid riskPercent",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        leverage
      ) ||
      leverage <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid leverage",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================
     * AUTHORITATIVE PIPELINE SERVICE
     * ========================================
     *
     * This route no longer owns trading
     * pipeline logic.
     *
     * Browser API, cron and future workers
     * will call the same server-side engine.
     */

    const result =
      await runTradingPipeline({
        symbols,

        accountBalance,

        riskPercent,

        leverage,
      });

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