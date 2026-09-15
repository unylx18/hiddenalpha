import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol");
    const timeframe = searchParams.get("timeframe");

    const supabase = createAdminClient();

    let query = supabase
      .from("trading_signals")
      .select(
        "id, symbol, timeframe, direction, result, realized_r_multiple, closed_at"
      )
      .not("result", "is", null)
      .not("realized_r_multiple", "is", null)
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: true });

    if (symbol) {
      query = query.eq("symbol", symbol);
    }

    if (timeframe) {
      query = query.eq("timeframe", timeframe);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Failed to fetch performance history: ${error.message}`
      );
    }

    let cumulativeR = 0;

    const history = (data ?? []).map((trade, index) => {
      const realizedR = Number(trade.realized_r_multiple);

      cumulativeR += realizedR;

      return {
        tradeNumber: index + 1,
        signalId: trade.id,
        symbol: trade.symbol,
        timeframe: trade.timeframe,
        direction: trade.direction,
        result: trade.result,
        realizedR,
        cumulativeR,
        closedAt: trade.closed_at,
      };
    });

    return Response.json({
      success: true,
      history,
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