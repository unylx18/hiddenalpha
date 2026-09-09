import { createMarketSnapshot } from "@/lib/market-data/market-snapshot";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") ?? "BTCUSDT";
    const timeframe = searchParams.get("timeframe") ?? "1m";

    const snapshot = await createMarketSnapshot(
      symbol,
      timeframe
    );

    return Response.json({
      success: true,
      provider: "bybit",
      snapshot,
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