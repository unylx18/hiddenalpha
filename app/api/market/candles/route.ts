import { ingestBybitCandles } from "@/lib/market-data/ingest-candles";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") ?? "BTCUSDT";
    const timeframe = searchParams.get("timeframe") ?? "1m";
    const limit = Number(searchParams.get("limit") ?? "100");

    const result = await ingestBybitCandles({
      symbol,
      timeframe,
      limit,
    });

    return Response.json({
      success: true,
      provider: "bybit",
      ...result,
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