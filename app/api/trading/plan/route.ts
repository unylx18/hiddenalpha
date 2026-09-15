import { NextRequest, NextResponse } from "next/server";
import {
  generateTradePlan,
} from "@/lib/trading/plan/trade-plan-service";

export async function GET(
  request: NextRequest
) {
  try {
    const searchParams =
      request.nextUrl.searchParams;

    const symbol =
      searchParams.get("symbol") ?? "BTCUSDT";

    const timeframe =
      searchParams.get("timeframe") ?? "1m";

    const accountBalance = Number(
      searchParams.get("accountBalance") ?? "10000"
    );

    const riskPercent = Number(
      searchParams.get("riskPercent") ?? "1"
    );

    const leverage = Number(
      searchParams.get("leverage") ?? "1"
    );

    if (
      !Number.isFinite(accountBalance) ||
      accountBalance <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "accountBalance must be greater than 0",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(riskPercent) ||
      riskPercent <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "riskPercent must be greater than 0",
        },
        { status: 400 }
      );
    }

    const tradePlan =
      await generateTradePlan({
        symbol,
        timeframe,
        accountBalance,
        riskPercent,
        leverage,
      });

    return NextResponse.json(
      tradePlan
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate trade plan",
      },
      { status: 400 }
    );
  }
}