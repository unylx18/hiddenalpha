import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  scanOpportunities,
} from "@/lib/trading/scanner/service";

const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

export async function GET(
  request: NextRequest
) {
  try {
    const params =
      request.nextUrl.searchParams;

    const symbolsParam =
      params.get("symbols");

    const symbols =
      symbolsParam
        ? symbolsParam
            .split(",")
            .map((symbol) =>
              symbol
                .trim()
                .toUpperCase()
            )
            .filter(Boolean)
        : DEFAULT_SYMBOLS;

    const accountBalance =
      Number(
        params.get(
          "accountBalance"
        ) ?? "10000"
      );

    const riskPercent =
      Number(
        params.get(
          "riskPercent"
        ) ?? "1"
      );

    const leverage =
      Number(
        params.get(
          "leverage"
        ) ?? "1"
      );

    if (
      symbols.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one symbol is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      symbols.length > 20
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Scanner supports a maximum of 20 symbols per request",
        },
        {
          status: 400,
        }
      );
    }

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
            "accountBalance must be greater than 0",
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
            "riskPercent must be greater than 0",
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
            "leverage must be greater than 0",
        },
        {
          status: 400,
        }
      );
    }

    const scanner =
      await scanOpportunities({
        symbols,

        accountBalance,
        riskPercent,
        leverage,
      });

    return NextResponse.json({
      success: true,

      ...scanner,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Opportunity scanner failed",
      },
      {
        status: 500,
      }
    );
  }
}