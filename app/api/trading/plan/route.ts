import {
  generateTradePlan,
} from "@/lib/trading/plan/service";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const symbol =
      body.symbol ?? "BTCUSDT";

    const timeframe =
      body.timeframe ?? "1m";

    const accountBalance =
      Number(body.accountBalance);

    const riskPercent =
      Number(body.riskPercent);

    const leverage =
      Number(body.leverage ?? 1);

    if (
      !Number.isFinite(accountBalance) ||
      !Number.isFinite(riskPercent)
    ) {
      return Response.json(
        {
          success: false,
          error:
            "accountBalance and riskPercent must be valid numbers",
        },
        { status: 400 }
      );
    }

    const result =
      await generateTradePlan({
        symbol,
        timeframe,

        accountBalance,
        riskPercent,

        leverage,

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
      provider: "bybit",
      plan: result,
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