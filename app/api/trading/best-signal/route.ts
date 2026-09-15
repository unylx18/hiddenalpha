import { NextRequest, NextResponse } from "next/server";
import { generateBestSignal } from "@/lib/trading/best-signal/service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const symbol =
      searchParams.get("symbol") ?? "BTCUSDT";

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

    if (
      !Number.isFinite(leverage) ||
      leverage <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "leverage must be greater than 0",
        },
        { status: 400 }
      );
    }

    const result =
      await generateBestSignal({
        symbol,
        accountBalance,
        riskPercent,
        leverage,
      });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate best signal",
      },
      { status: 400 }
    );
  }
}