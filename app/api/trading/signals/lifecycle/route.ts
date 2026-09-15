import { updateSignalLifecycle } from "@/lib/trading/signal/lifecycle-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.signalId) {
      throw new Error("signalId is required");
    }

    const currentPrice = Number(body.currentPrice);

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      throw new Error("currentPrice must be a valid positive number");
    }

    const signal = await updateSignalLifecycle(
      body.signalId,
      currentPrice
    );

    return Response.json({
      success: true,
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
      { status: 400 }
    );
  }
}
