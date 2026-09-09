import { calculateMarketIndicators } from "@/lib/trading/services/indicator-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") ?? "BTCUSDT";
    const timeframe = searchParams.get("timeframe") ?? "1m";

    const indicators = await calculateMarketIndicators(
      symbol,
      timeframe
    );

    return Response.json({
      success: true,
      provider: "bybit",
      indicators,
    });
  } catch (error) {
    return Response.json(
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