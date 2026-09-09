import { generateSignal } from "@/lib/trading/signal/signal-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol =
      searchParams.get("symbol") ?? "BTCUSDT";

    const timeframe =
      searchParams.get("timeframe") ?? "1m";

    const signal = await generateSignal(
      symbol,
      timeframe
    );

    return Response.json({
      success: true,
      provider: "bybit",
      signal,
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