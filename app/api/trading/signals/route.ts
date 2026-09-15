import { NextRequest, NextResponse } from "next/server";
import { generateSignal } from "@/lib/trading/signal/signal-service";

const TIMEFRAMES = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
];

export async function GET(request: NextRequest) {
  try {
    const symbol =
      request.nextUrl.searchParams.get("symbol") ??
      "BTCUSDT";

    const results = [];

    for (const timeframe of TIMEFRAMES) {
      try {
        const signal = await generateSignal(
          symbol,
          timeframe
        );

        results.push({
          success: true,
          ...signal,
        });
      } catch (error) {
        results.push({
          success: false,
          symbol,
          timeframe,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    const successCount =
      results.filter(
        (result) => result.success
      ).length;

    const failedCount =
      results.filter(
        (result) => !result.success
      ).length;

    return NextResponse.json({
      success: failedCount === 0,
      symbol,
      timeframes: TIMEFRAMES,
      total: results.length,
      successCount,
      failedCount,
      signals: results,
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
      { status: 500 }
    );
  }
}