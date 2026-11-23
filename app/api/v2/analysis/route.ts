import { getBybitKlines } from "@/lib/market-data/bybit";
import {CRYPTO_SYMBOLS} from "@/lib/trading/v2/symbol-registry";
import { getBybitTimeframe } from "@/lib/market-data/config/timeframes";
import { calculateV2Context, AnalysisInputError, type AnalysisPayload, type AnalysisCandle } from "@/lib/trading/v2/stateless-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYMBOLS = new Set<string>(CRYPTO_SYMBOLS);
const FRAME_MS: Record<string, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

// In-process, best-effort sharing. This is not a distributed rate limiter.
// Twelve allowlisted symbols x seven timeframes, never arbitrary user-controlled keys.
const completedCache = new Map<string, { data: AnalysisPayload; expiresAt: number }>();
const pendingRequests = new Map<string, Promise<AnalysisPayload>>();
const MAX_CACHED = SYMBOLS.size * Object.keys(FRAME_MS).length;
const UPSTREAM_TIMEOUT_MS = 8_000;

function failure(message: string, status: number) {
  return Response.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function success(data: AnalysisPayload, source: "HIT" | "MISS" | "COALESCED") {
  return Response.json(
    { success: true, ...data, cache: source },
    { headers: { "Cache-Control": "no-store" } }
  );
}

async function calculateFromProvider(
  symbol: string,
  timeframe: string,
  duration: number
): Promise<AnalysisPayload> {
  const raw = await getBybitKlines(
    symbol,
    getBybitTimeframe(timeframe),
    310,
    undefined,
    AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  );

  const candles: AnalysisCandle[] = raw
    .filter((row) => Number.isFinite(row.openTime) && row.openTime > 0)
    .map((row) => ({
      openTime: row.openTime,
      timestamp: new Date(row.openTime).toISOString(),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    }));

  return calculateV2Context({
    symbol,
    timeframe,
    duration,
    candles,
    provider: "bybit",
    marketType: "crypto",
    volumeKind: "traded_contracts",
    requireContinuousHistory: true,
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const symbol = (params.get("symbol") ?? "").toUpperCase();
  const timeframe = (params.get("timeframe") ?? "").toLowerCase();
  const duration = FRAME_MS[timeframe];

  if (!SYMBOLS.has(symbol) || !duration) {
    return failure("Unsupported crypto symbol or timeframe", 400);
  }

  const key = symbol + ":" + timeframe;
  const existing = completedCache.get(key);
  const now = Date.now();
  if (existing && existing.expiresAt > now) {
    // Revalidate even cached results so no cached market bias becomes stale.
    const lastClose = Date.parse(existing.data.lastClosedAt);
    if (now - lastClose <= Math.max(duration * 2, 120_000)) {
      return success(existing.data, "HIT");
    }
    completedCache.delete(key);
  }

  let pending = pendingRequests.get(key);
  const alreadyRunning = Boolean(pending);
  if (!pending) {
    pending = calculateFromProvider(symbol, timeframe, duration)
      .then((data) => {
        const ttl = Math.min(30_000, Math.max(10_000, duration / 4));
        if (completedCache.size >= MAX_CACHED) {
          const first = completedCache.keys().next().value;
          if (first) completedCache.delete(first);
        }
        completedCache.set(key, { data, expiresAt: Date.now() + ttl });
        return data;
      })
      .finally(() => {
        pendingRequests.delete(key);
      });
    pendingRequests.set(key, pending);
  }

  try {
    const data = await pending;
    return success(data, alreadyRunning ? "COALESCED" : "MISS");
  } catch (error) {
    if (error instanceof AnalysisInputError) {
      return failure(error.message, error.status);
    }
    return failure("Live Bybit provider unavailable or timed out; no analysis generated", 502);
  }
}
