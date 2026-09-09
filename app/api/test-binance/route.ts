import { getBybitKlines } from "@/lib/market-data/bybit";

export async function GET() {
  try {
    const candles = await getBybitKlines("BTCUSDT", "1", 5);

    return Response.json({
      success: true,
      provider: "bybit",
      symbol: "BTCUSDT",
      timeframe: "1m",
      count: candles.length,
      data: candles,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}