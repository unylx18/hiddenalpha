import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const symbol =
      searchParams.get("symbol");

    const timeframe =
      searchParams.get("timeframe");

    const limit = Math.min(
      Number(searchParams.get("limit") ?? 20),
      100
    );

    const supabase =
      createAdminClient();

    let query = supabase
      .from("trading_signals")
      .select("*")
      .order("timestamp", {
        ascending: false,
      })
      .limit(limit);

    if (symbol) {
      query = query.eq(
        "symbol",
        symbol
      );
    }

    if (timeframe) {
      query = query.eq(
        "timeframe",
        timeframe
      );
    }

    const { data, error } =
      await query;

    if (error) {
      throw new Error(
        `Failed to fetch signal history: ${error.message}`
      );
    }

    return Response.json({
      success: true,
      signals: data,
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
