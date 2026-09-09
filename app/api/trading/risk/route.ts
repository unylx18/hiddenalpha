import { generateSignal } from "@/lib/trading/signal/signal-service";
import { calculateSignalRisk } from "@/lib/trading/risk/signal-risk";
import { calculateTradingRisk } from "@/lib/trading/risk/service";
import {
  RiskCalculationInput,
  RiskDirection,
} from "@/lib/trading/risk/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      symbol = "BTCUSDT",
      timeframe = "1m",

      direction,

      accountBalance,
      riskPercent,

      entryPrice,
      stopLossPrice,
      takeProfitPrice,

      leverage = 1,

      feePercent,
      slippagePercent,
    } = body;

    if (
      accountBalance === undefined ||
      riskPercent === undefined ||
      entryPrice === undefined ||
      stopLossPrice === undefined
    ) {
      return Response.json(
        {
          success: false,
          error:
            "accountBalance, riskPercent, entryPrice and stopLossPrice are required",
        },
        { status: 400 }
      );
    }

    /*
     * MANUAL MODE
     *
     * If direction is provided, calculate
     * risk directly without generating a signal.
     */
    if (
      direction === "LONG" ||
      direction === "SHORT"
    ) {
      const riskInput: RiskCalculationInput = {
        direction: direction as RiskDirection,

        accountBalance: Number(
          accountBalance
        ),

        riskPercent: Number(
          riskPercent
        ),

        entryPrice: Number(
          entryPrice
        ),

        stopLossPrice: Number(
          stopLossPrice
        ),

        takeProfitPrice:
          takeProfitPrice !== undefined
            ? Number(takeProfitPrice)
            : undefined,

        leverage: Number(leverage),

        feePercent:
          feePercent !== undefined
            ? Number(feePercent)
            : undefined,

        slippagePercent:
          slippagePercent !== undefined
            ? Number(slippagePercent)
            : undefined,
      };

      const risk =
        calculateTradingRisk(riskInput);

      return Response.json({
        success: true,
        mode: "MANUAL",
        risk,
      });
    }

    /*
     * SIGNAL MODE
     *
     * If direction is not provided,
     * generate a signal first.
     */
    const signal =
      await generateSignal(
        symbol,
        timeframe
      );

    const risk =
      calculateSignalRisk({
        signal,

        accountBalance: Number(
          accountBalance
        ),

        riskPercent: Number(
          riskPercent
        ),

        entryPrice: Number(
          entryPrice
        ),

        stopLossPrice: Number(
          stopLossPrice
        ),

        takeProfitPrice:
          takeProfitPrice !== undefined
            ? Number(takeProfitPrice)
            : undefined,

        leverage: Number(leverage),
      });

    return Response.json({
      success: true,
      mode: "SIGNAL",
      signal,
      risk,
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