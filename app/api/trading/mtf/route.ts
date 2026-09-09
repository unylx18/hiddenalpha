import {
  getMultiTimeframeAnalysis,
} from "@/lib/trading/mtf/service";

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const symbol =
      searchParams.get("symbol") ??
      "BTCUSDT";

    const result =
      await getMultiTimeframeAnalysis(
        symbol
      );

    return Response.json({
      success: true,
      provider: "bybit",
      mtf: result,
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