import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  publishBestOpportunity,
} from "@/lib/trading/signal/publisher-service";

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ========================================
     * REQUEST BODY
     * ========================================
     *
     * Default to an empty object so TypeScript
     * always knows body exists.
     */

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

    /*
     * ========================================
     * PARAMETERS
     * ========================================
     */

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
              (symbol) =>
                String(
                  symbol
                )
                  .trim()
                  .toUpperCase()
            )
            .filter(
              (symbol) =>
                symbol.length > 0
            )
        : undefined;

    /*
     * ========================================
     * VALIDATION
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

    if (
      symbols &&
      symbols.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "symbols cannot be empty",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================
     * PUBLISHER
     * ========================================
     */

    const result =
      await publishBestOpportunity({
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
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}