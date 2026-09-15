import { recordSignalPerformance } from "@/lib/trading/performance/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.signalId) {
      throw new Error("signalId is required");
    }

    const exitPrice = Number(body.exitPrice);

    if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
      throw new Error("exitPrice must be a valid positive number");
    }

    const signal = await recordSignalPerformance(
      body.signalId,
      exitPrice
    );

    return Response.json({
      success: true,
      signal,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}