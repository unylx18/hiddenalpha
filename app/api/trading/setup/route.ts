import { generateTradeSetup } from "@/lib/trading/setup/service";

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const symbol =
      searchParams.get("symbol") ?? "BTCUSDT";

    const timeframe =
      searchParams.get("timeframe") ?? "1m";

    const result =
      await generateTradeSetup(
        symbol,
        timeframe
      );

    return Response.json({
      success: true,
      provider: "bybit",
      ...result,
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
      { status: 400 }
    );
  }
}