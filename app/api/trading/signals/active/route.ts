import {
  NextResponse,
} from "next/server";

import {
  getLatestActiveTradingSignal,
} from "@/lib/trading/signal/repository";

import {
  getBybitTicker,
} from "@/lib/market-data/bybit-ticker";

export async function GET() {
  try {
    /*
     * ========================================
     * ACTIVE SIGNAL
     * ========================================
     */

    const signal =
      await getLatestActiveTradingSignal();

    if (!signal) {
      return NextResponse.json({
        success: true,

        activeSignal: null,
      });
    }

    /*
     * ========================================
     * LIVE PRICE
     * ========================================
     */

    const ticker =
      await getBybitTicker(
        signal.symbol
      );

    const currentPrice =
      Number(
        ticker.lastPrice
      );

    const entryPrice =
      Number(
        signal.entry_price
      );

    const stopLossPrice =
      Number(
        signal.stop_loss_price
      );

    const takeProfit2Price =
      Number(
        signal.take_profit_price
      );

    if (
      !Number.isFinite(
        currentPrice
      ) ||
      !Number.isFinite(
        entryPrice
      ) ||
      !Number.isFinite(
        stopLossPrice
      ) ||
      !Number.isFinite(
        takeProfit2Price
      )
    ) {
      throw new Error(
        "Active signal contains invalid trade levels"
      );
    }

    /*
     * TP1 = 1R.
     */

    const riskDistance =
      Math.abs(
        entryPrice -
          stopLossPrice
      );

    const takeProfit1Price =
      signal.direction ===
      "LONG"
        ? entryPrice +
          riskDistance
        : entryPrice -
          riskDistance;

    /*
     * ========================================
     * TRADE PROGRESS
     * ========================================
     */

    const directionalMove =
      signal.direction ===
      "LONG"
        ? currentPrice -
          entryPrice
        : entryPrice -
          currentPrice;

    const progressR =
      riskDistance > 0
        ? directionalMove /
          riskDistance
        : 0;

    const distanceFromEntryPercent =
      (
        Math.abs(
          currentPrice -
            entryPrice
        ) /
        entryPrice
      ) *
      100;

    const publishedAt =
      new Date(
        signal.timestamp
      );

    const ageMinutes =
      Math.max(
        0,
        (
          Date.now() -
          publishedAt.getTime()
        ) /
          60000
      );

    /*
     * ========================================
     * NORMALIZED RESPONSE
     * ========================================
     */

    return NextResponse.json({
      success: true,

      activeSignal: {
        id:
          signal.id,

        symbol:
          signal.symbol,

        timeframe:
          signal.timeframe,

        direction:
          signal.direction,

        confidence:
          Number(
            signal.confidence
          ),

        confidenceLevel:
          signal.confidence_level,

        quality:
          signal.quality,

        summary:
          signal.summary,

        status:
          signal.status,

        lifecyclePhase:
          signal.lifecycle_phase ??
          "WAITING_ENTRY",

        publishedAt:
          signal.timestamp,

        entryTriggeredAt:
          signal.entry_triggered_at,

        tp1HitAt:
          signal.tp1_hit_at,

        tp2HitAt:
          signal.tp2_hit_at,

        stopHitAt:
          signal.stop_hit_at,

        entryPrice,

        stopLossPrice,

        takeProfit1Price,

        takeProfit2Price,

        currentPrice,

        progressR,

        distanceFromEntryPercent,

        ageMinutes,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}