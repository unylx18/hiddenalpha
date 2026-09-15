import { generateAndSaveSignal } from "@/lib/trading/signal/persistence-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const symbol = body.symbol ?? "BTCUSDT";
    const timeframe = body.timeframe ?? "1m";

    const result = await generateAndSaveSignal(
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