import { getBybitTicker } from "@/lib/market-data/bybit-ticker";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol =
      searchParams.get("symbol") ?? "BTCUSDT";

    const ticker = await getBybitTicker(symbol);

    return Response.json({
      success: true,
      provider: "bybit",
      ticker,
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