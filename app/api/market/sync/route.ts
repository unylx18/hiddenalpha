import { authorizeMutation } from "@/lib/security/authorize-mutation";
import { syncBybitMarkets } from "@/lib/market-data/jobs/sync-bybit";

export async function POST(request: Request) {
  const denied = await authorizeMutation(request);
  if (denied) return denied;
  try {
    const results = await syncBybitMarkets();

    const successCount = results.filter(
      (result) => result.success
    ).length;

    const failedCount = results.filter(
      (result) => !result.success
    ).length;

    return Response.json({
      success: failedCount === 0,
      provider: "bybit",
      total: results.length,
      successCount,
      failedCount,
      results,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : String(error),
      },
      { status: 500 }
    );
  }
}