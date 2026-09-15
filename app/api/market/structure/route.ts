import { createAdminClient } from "@/lib/supabase/admin";
import {
  detectMarketStructure,
  type MarketStructureCandle,
} from "@/lib/market-structure/detect-swings";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") ?? "BTCUSDT";
    const timeframe = searchParams.get("timeframe") ?? "1m";

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit") ?? "200"),
        50
      ),
      2000
    );

    const supabase = createAdminClient();

    const { data: market, error: marketError } =
      await supabase
        .from("markets")
        .select("id, symbol, market_type")
        .eq("symbol", symbol)
        .eq("market_type", "PERPETUAL")
        .limit(1)
        .maybeSingle();

    if (marketError) {
      throw new Error(marketError.message);
    }

    if (!market) {
      return Response.json(
        {
          success: false,
          error: `Market ${symbol} PERPETUAL not found`,
        },
        { status: 404 }
      );
    }

    const { data: candles, error } =
      await supabase
        .from("candles")
        .select(
          "timestamp, open, high, low, close"
        )
        .eq("market_id", market.id)
        .eq("timeframe", timeframe)
        .order("timestamp", {
          ascending: false,
        })
        .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    const normalizedCandles: MarketStructureCandle[] =
      (candles ?? [])
        .map((candle) => ({
          timestamp: candle.timestamp,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        }))
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() -
            new Date(b.timestamp).getTime()
        );

    const structure = detectMarketStructure(
      normalizedCandles,
      {
        leftBars: 2,
        rightBars: 2,
      }
    );

    return Response.json({
      success: true,
      symbol: market.symbol,
      marketType: market.market_type,
      timeframe,
      candleCount: normalizedCandles.length,
      trend: structure.trend,
      swings: structure.swings,
      breaks: structure.breaks,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}