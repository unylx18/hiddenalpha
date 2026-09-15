import { getPerformanceSummary } from "@/lib/trading/performance/summary-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const symbol = searchParams.get("symbol") ?? undefined;
    const timeframe = searchParams.get("timeframe") ?? undefined;

    const summary = await getPerformanceSummary(
      symbol,
      timeframe
    );

    return Response.json({
      success: true,
      summary,
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