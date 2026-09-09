import { generateManualTradePlan } from "@/lib/trading/plan/manual-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const plan = generateManualTradePlan({
      symbol: body.symbol ?? "BTCUSDT",
      timeframe: body.timeframe ?? "1m",
      direction: body.direction,
      entryPrice: Number(body.entryPrice),
      stopLossPrice: Number(body.stopLossPrice),
      takeProfitPrice: Number(body.takeProfitPrice),
      accountBalance: Number(body.accountBalance),
      riskPercent: Number(body.riskPercent),
      leverage:
        body.leverage !== undefined
          ? Number(body.leverage)
          : undefined,
      feePercent:
        body.feePercent !== undefined
          ? Number(body.feePercent)
          : undefined,
      slippagePercent:
        body.slippagePercent !== undefined
          ? Number(body.slippagePercent)
          : undefined,
    });

    return Response.json({
      success: true,
      mode: "MANUAL",
      plan,
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