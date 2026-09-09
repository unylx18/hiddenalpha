import { getMarketRegime } from "@/lib/trading/services/regime-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") ?? "BTCUSDT";
    const timeframe = searchParams.get("timeframe") ?? "1m";

    const regime = await getMarketRegime(
      symbol,
      timeframe
    );

    return Response.json({
      success: true,
      provider: "bybit",
      regime,
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