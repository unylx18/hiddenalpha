import {
  getOandaCompletedCandles, isForexSymbol, supportedForexTimeframe,
  OandaConfigMissing, OandaDataUnavailable,
} from "@/lib/market-data/oanda-candles";
import {
  calculateV2Context, AnalysisInputError, type AnalysisPayload,
} from "@/lib/trading/v2/stateless-analysis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FRAME_MS: Record<string, number> = {
  "1m": 60_000, "3m": 180_000, "5m": 300_000,
  "15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000,
};

// Per-instance, best-effort response caching; NOT a distributed rate limiter.
const cache = new Map<string, { value: AnalysisPayload; expiresAt: number }>();
const inFlight = new Map<string, Promise<AnalysisPayload>>();

function fail(error: string, status: number) {
  return Response.json({success: false, error}, {
    status, headers: {"Cache-Control": "no-store"},
  });
}

function ok(data: AnalysisPayload, status: "HIT" | "MISS" | "COALESCED") {
  return Response.json({success: true, ...data, cache: status}, {
    headers: {"Cache-Control": "no-store"},
  });
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const symbol = (query.get("symbol") ?? "").toUpperCase();
  const timeframe = (query.get("timeframe") ?? "").toLowerCase();
  if (!isForexSymbol(symbol) || !supportedForexTimeframe(timeframe)) {
    return fail("Unsupported Forex instrument or timeframe", 400);
  }

  if (!process.env.OANDA_API_TOKEN || !process.env.OANDA_ACCOUNT_ID) {
    return fail("Forex analysis needs an OANDA v20 connection configured on the server", 503);
  }

  const duration = FRAME_MS[timeframe];
  const key = symbol + ":" + timeframe;
  const now = Date.now();

  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    const lastClose = Date.parse(existing.value.lastClosedAt);
    if (Number.isFinite(lastClose) && now - lastClose <= Math.max(duration * 2, 120_000)) {
      return ok(existing.value, "HIT");
    }
    cache.delete(key);
  }

  let pending = inFlight.get(key);
  const joined = Boolean(pending);
  if (!pending) {
    pending = (async () => {
      const candles = await getOandaCompletedCandles(symbol, timeframe);
      return calculateV2Context({
        symbol, timeframe, duration, candles,
        provider: "oanda",
        marketType: "forex",
        volumeKind: "price_updates",
        // FX has scheduled weekend breaks; never fabricate missing bars.
        requireContinuousHistory: false,
      });
    })().then((data) => {
      if (cache.size >= 21) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      cache.set(key, {
        value: data,
        expiresAt: Date.now() + Math.min(30_000, Math.max(10_000, duration/4)),
      });
      return data;
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }

  try {
    return ok(await pending, joined ? "COALESCED" : "MISS");
  } catch(error) {
    if (error instanceof OandaConfigMissing) {
      return fail("Forex provider is not configured", 503);
    }
    if (error instanceof AnalysisInputError) return fail(error.message, error.status);
    if (error instanceof OandaDataUnavailable) return fail(error.message, 502);
    return fail("Forex market data request timed out or failed", 502);
  }
}
