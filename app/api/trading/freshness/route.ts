import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  generateTradePlan,
} from "@/lib/trading/plan/trade-plan-service";

import {
  getBybitTicker,
} from "@/lib/market-data/bybit-ticker";

import {
  evaluateSignalFreshness,
} from "@/lib/trading/freshness/evaluator";

import {
  SignalFreshnessResult,
} from "@/lib/trading/freshness/types";

export async function GET(
  request: NextRequest
) {
  try {
    const searchParams =
      request.nextUrl.searchParams;

    const symbol =
      searchParams.get(
        "symbol"
      ) ?? "BTCUSDT";

    const timeframe =
      searchParams.get(
        "timeframe"
      ) ?? "1h";

    const accountBalance =
      Number(
        searchParams.get(
          "accountBalance"
        ) ?? "10000"
      );

    const riskPercent =
      Number(
        searchParams.get(
          "riskPercent"
        ) ?? "1"
      );

    const leverage =
      Number(
        searchParams.get(
          "leverage"
        ) ?? "1"
      );

    if (
      !Number.isFinite(
        accountBalance
      ) ||
      accountBalance <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "accountBalance must be greater than 0",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        riskPercent
      ) ||
      riskPercent <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "riskPercent must be greater than 0",
        },
        {
          status: 400,
        }
      );
    }

    const [
      tradePlan,
      ticker,
    ] = await Promise.all([
      generateTradePlan({
        symbol,
        timeframe,
        accountBalance,
        riskPercent,
        leverage,
      }),

      getBybitTicker(
        symbol
      ),
    ]);

    const {
      signal,
      setup,
      risk,
    } = tradePlan;

    /*
     * WAIT / no setup is not
     * an application error.
     */

    if (
      signal.direction ===
        "WAIT" ||
      !setup
    ) {
      const freshness: SignalFreshnessResult =
        {
          status:
            "NO_SETUP",

          actionable:
            false,

          currentPrice:
            ticker.lastPrice,

          entryPrice:
            null,

          distanceFromEntryPercent:
            null,

          progressR:
            null,

          ageMinutes:
            null,

          maxAgeMinutes:
            null,

          reason:
            "No actionable LONG or SHORT setup is currently available",
        };

      return NextResponse.json(
        {
          success: true,

          provider:
            "bybit",

          symbol,
          timeframe,

          ticker,

          signal,
          setup: null,
          risk: null,

          freshness,
        }
      );
    }

    const freshness =
      evaluateSignalFreshness(
        {
          direction:
            setup.direction,

          timeframe:
            setup.timeframe,

          timestamp:
            setup.timestamp,

          entryPrice:
            setup.entryPrice,

          stopLossPrice:
            setup.stopLossPrice,

          takeProfit1Price:
            setup.takeProfit1Price,

          takeProfit2Price:
            setup.takeProfit2Price,

          currentPrice:
            ticker.lastPrice,
        }
      );

    return NextResponse.json(
      {
        success: true,

        provider:
          "bybit",

        symbol,
        timeframe,

        ticker,

        signal,
        setup,
        risk,

        freshness,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to evaluate signal freshness",
      },
      {
        status: 500,
      }
    );
  }
}