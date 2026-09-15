import { createAdminClient } from "@/lib/supabase/admin";
import { ingestBybitCandles } from "@/lib/market-data/ingest-candles";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") ?? "BTCUSDT";
    const timeframe = searchParams.get("timeframe") ?? "1m";

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? "100"), 1),
      1000
    );

    const supabase = createAdminClient();

    const { data: market, error: marketError } = await supabase
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

    const { data: candles, error: candlesError } = await supabase
      .from("candles")
      .select(
        "id, market_id, timeframe, timestamp, open, high, low, close, volume"
      )
      .eq("market_id", market.id)
      .eq("timeframe", timeframe)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (candlesError) {
      throw new Error(candlesError.message);
    }

    return Response.json({
      success: true,
      symbol: market.symbol,
      marketType: market.market_type,
      timeframe,
      count: candles?.length ?? 0,
      candles: candles ?? [],
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

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") ?? "BTCUSDT";
    const timeframe = searchParams.get("timeframe") ?? "1m";
    const limit = Number(searchParams.get("limit") ?? "100");

    const result = await ingestBybitCandles({
      symbol,
      timeframe,
      limit,
    });

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
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}