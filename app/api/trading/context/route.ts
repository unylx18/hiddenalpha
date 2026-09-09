import { getMarketContext } from "@/lib/trading/services/context-service";
import { presentAlphaContext } from "@/lib/trading/context/alpha-presenter";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol =
      searchParams.get("symbol") ?? "BTCUSDT";

    const timeframe =
      searchParams.get("timeframe") ?? "1m";

    const context = await getMarketContext(
      symbol,
      timeframe
    );

    const alpha =
      presentAlphaContext(context);

    return Response.json({
      success: true,
      provider: "bybit",
      alpha,
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