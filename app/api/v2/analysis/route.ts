import { getBybitKlines } from "@/lib/market-data/bybit";
import { getBybitTimeframe } from "@/lib/market-data/config/timeframes";
import { calculateEMA, calculateRSI, calculateATR } from "@/lib/trading/calculations/indicators";
import { calculateVolumeAnalysis } from "@/lib/trading/volume/calculator";
import { detectMarketStructure } from "@/lib/market-structure/detect-swings";
import { calculateAlphaContext } from "@/lib/trading/context/alpha-calculator";
import { calculateAlphaScore } from "@/lib/trading/context/alpha-score-calculator";
import { calculateMarketRegime } from "@/lib/trading/regime/calculator";
import type { IndicatorResult } from "@/lib/trading/types/indicator";

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

type Candle = {
  timestamp: string;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const errorResponse = (message: string, status: number) =>
  Response.json({ success: false, error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const symbol = (params.get("symbol") ?? "").toUpperCase();
  const timeframe = (params.get("timeframe") ?? "").toLowerCase();
  const duration = FRAME_MS[timeframe];

  if (!SYMBOLS.has(symbol) || !duration) {
    return errorResponse("Unsupported crypto symbol or timeframe", 400);
  }

  try {
    const providerInterval = getBybitTimeframe(timeframe);
    const raw = await getBybitKlines(symbol, providerInterval, 310);
    const now = Date.now();

    // Only fully closed candles. The latest provider candle may still be forming.
    const sorted = raw
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
        Number.isFinite(c.openTime) && c.openTime > 0 &&
        c.openTime + duration <= now &&
        [c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite) &&
        c.low > 0 && c.volume >= 0 &&
        c.high >= Math.max(c.open,c.close,c.low) &&
        c.low <= Math.min(c.open,c.close,c.high)
      )
      .sort((a, b) => a.openTime - b.openTime)
      .filter((c, i, rows) => i === 0 || c.openTime !== rows[i - 1].openTime);

    if (sorted.length < 200) {
      return errorResponse("Not enough completed candles for a 200-period EMA", 503);
    }

    const latest = sorted[sorted.length - 1];
    if (now - (latest.openTime + duration) > Math.max(duration * 2, 15 * 60_000)) {
      return errorResponse("Bybit market candles are stale; analysis unavailable", 503);
    }

    const closes = sorted.map(c => c.close);
    const highs = sorted.map(c => c.high);
    const lows = sorted.map(c => c.low);
    const volumes = sorted.map(c => c.volume);
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
    const volume = calculateVolumeAnalysis(volumes, 20);
    const structure = detectMarketStructure(sorted, { leftBars: 2, rightBars: 2 });
    const alphaContext = calculateAlphaContext(indicators, volume, structure);
    const alphaScore = calculateAlphaScore(alphaContext);
    const regime = calculateMarketRegime(indicators);

    return Response.json({
      success: true,
      provider: "bybit",
      architecture: "stateless-on-demand",
      fetchedAt: new Date(now).toISOString(),
      candleCount: sorted.length,
      alpha: {
        symbol,
        timeframe,
        timestamp: indicators.timestamp,
        market: {
          bias: alphaScore.bias,
          score: alphaScore.score,
          confidence: alphaScore.confidence,
        },
        trend: {
          direction: alphaContext.trend.direction,
          strength: alphaContext.trend.strength,
        },
        momentum: {
          direction: alphaContext.momentum.direction,
          strength: alphaContext.momentum.strength,
        },
        volume: {
          condition: volume.condition,
          ratio: volume.volumeRatio,
        },
        volatility: {
          level: alphaContext.volatility.level,
          value: alphaContext.volatility.value,
          percentage: alphaContext.volatility.percentage,
        },
        marketRegime: regime.regime,
        reasons: alphaScore.reasons.slice(0, 8),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse("Live market provider unavailable; no analysis generated", 502);
  }
}
