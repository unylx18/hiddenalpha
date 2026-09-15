import { updateTradingSignalStatus } from "@/lib/trading/signal/repository";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.signalId) {
      throw new Error("signalId is required");
    }

    const allowedStatuses = [
      "ACTIVE",
      "INVALIDATED",
      "EXPIRED",
      "COMPLETED",
    ];

    if (!allowedStatuses.includes(body.status)) {
      throw new Error(
        "Invalid signal status"
      );
    }

    const signal =
      await updateTradingSignalStatus(
        body.signalId,
        body.status
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