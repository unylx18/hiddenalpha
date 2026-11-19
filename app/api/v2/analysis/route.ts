import { getBybitKlines } from "@/lib/market-data/bybit";
import { getBybitTimeframe } from "@/lib/market-data/config/timeframes";
import { calculateEMA, calculateRSI, calculateATR } from "@/lib/trading/calculations/indicators";
import { calculateVolumeAnalysis } from "@/lib/trading/volume/calculator";
import { detectMarketStructure } from "@/lib/market-structure/detect-swings";
import { calculateAlphaContext } from "@/lib/trading/context/alpha-calculator";
import { calculateAlphaScore } from "@/lib/trading/context/alpha-score-calculator";
import { calculateMarketRegime } from "@/lib/trading/regime/calculator";
import type { IndicatorResult } from "@/lib/trading/types/indicator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);
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
// Only 3 symbols x 7 timeframes are accepted; no unbounded user-controlled keys.
const completedCache = new Map<string, { data: AnalysisPayload; expiresAt: number }>();
const pendingRequests = new Map<string, Promise<AnalysisPayload>>();
const MAX_CACHED = SYMBOLS.size * Object.keys(FRAME_MS).length;
const UPSTREAM_TIMEOUT_MS = 8_000;

type Candle = {
  timestamp: string;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type AnalysisPayload = {
  provider: "bybit";
  architecture: "stateless-on-demand";
  fetchedAt: string;
  lastClosedAt: string;
  candleCount: number;
  alpha: {
    symbol: string;
    timeframe: string;
    timestamp: string;
    market: { bias: "BULLISH" | "BEARISH" | "NEUTRAL"; score: number; confidence: number };
    trend: { direction: string; strength: number };
    momentum: { direction: string; strength: number };
    volume: { condition: string; ratio: number };
    volatility: { level: string; value: number | null; percentage: number | null };
    marketRegime: string;
    reasons: string[];
  };
};

class AnalysisUnavailable extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

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
  const now = Date.now();

  // Do not include Bybit's forming candle, invalid prices, or duplicate timestamps.
  const sorted = raw
    .filter((row) => Number.isFinite(row.openTime) && row.openTime > 0)
    .map((row): Candle => ({
      openTime: row.openTime,
      timestamp: new Date(row.openTime).toISOString(),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    }))
    .filter((c) =>
      c.openTime + duration <= now &&
      [c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite) &&
      c.low > 0 && c.volume >= 0 &&
      c.high >= Math.max(c.open, c.close, c.low) &&
      c.low <= Math.min(c.open, c.close, c.high)
    )
    .sort((a, b) => a.openTime - b.openTime)
    .filter((c, i, rows) => i === 0 || c.openTime !== rows[i - 1].openTime);

  if (sorted.length < 200) {
    throw new AnalysisUnavailable(503, "Not enough completed candles for EMA 200");
  }

  // A directional score on incomplete/gapped history could be misleading.
  const latest200 = sorted.slice(-200);
  for (let i = 1; i < latest200.length; i++) {
    if (latest200[i].openTime - latest200[i - 1].openTime !== duration) {
      throw new AnalysisUnavailable(503, "Recent candle history contains a gap; no analysis generated");
    }
  }

  const latest = sorted[sorted.length - 1];
  const latestClosedAt = latest.openTime + duration;
  const freshnessLimit = Math.max(duration * 2, 120_000);
  if (now - latestClosedAt > freshnessLimit) {
    throw new AnalysisUnavailable(503, "Latest closed candle is stale; no analysis generated");
  }

  const closes = sorted.map((c) => c.close);
  const highs = sorted.map((c) => c.high);
  const lows = sorted.map((c) => c.low);
  const volumeValues = sorted.map((c) => c.volume);

  const indicators: IndicatorResult = {
    symbol,
    timeframe,
    timestamp: latest.timestamp,
    price: latest.close,
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
    rsi14: calculateRSI(closes, 14),
    atr14: calculateATR(highs, lows, closes, 14),
  };

  const volume = calculateVolumeAnalysis(volumeValues, 20);
  const structure = detectMarketStructure(sorted, { leftBars: 2, rightBars: 2 });
  const context = calculateAlphaContext(indicators, volume, structure);
  const score = calculateAlphaScore(context);
  const regime = calculateMarketRegime(indicators);

  return {
    provider: "bybit",
    architecture: "stateless-on-demand",
    fetchedAt: new Date(now).toISOString(),
    lastClosedAt: new Date(latestClosedAt).toISOString(),
    candleCount: sorted.length,
    alpha: {
      symbol,
      timeframe,
      timestamp: indicators.timestamp,
      market: {
        bias: score.bias,
        score: score.score,
        confidence: score.confidence,
      },
      trend: { direction: context.trend.direction, strength: context.trend.strength },
      momentum: { direction: context.momentum.direction, strength: context.momentum.strength },
      volume: { condition: volume.condition, ratio: volume.volumeRatio },
      volatility: {
        level: context.volatility.level,
        value: context.volatility.value,
        percentage: context.volatility.percentage,
      },
      marketRegime: regime.regime,
      reasons: score.reasons.slice(0, 8),
    },
  };
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
    if (error instanceof AnalysisUnavailable) {
      return failure(error.message, error.status);
    }
    return failure("Live Bybit provider unavailable or timed out; no analysis generated", 502);
  }
}
