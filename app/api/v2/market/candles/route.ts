import { getBybitKlines } from "@/lib/market-data/bybit";
import { getBybitTimeframe } from "@/lib/market-data/config/timeframes";

const SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);
const TIMEFRAMES: Record<string, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const symbol = (params.get("symbol") ?? "").toUpperCase();
  const timeframe = (params.get("timeframe") ?? "").toLowerCase();

  if (!SYMBOLS.has(symbol) || !Object.hasOwn(TIMEFRAMES, timeframe)) {
    return Response.json(
      { success: false, error: "Unsupported Crypto symbol or timeframe" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const raw = await getBybitKlines(symbol, getBybitTimeframe(timeframe), 96);
    const now = Date.now();
    const interval = TIMEFRAMES[timeframe];

    const candles = raw
      .map((row) => ({
        timestamp: new Date(row.openTime).toISOString(),
        openTime: row.openTime,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }))
      .filter((c) =>
        Number.isFinite(c.openTime) &&
        c.openTime > 0 &&
        c.openTime + interval <= now &&
        [c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite) &&
        c.high >= Math.max(c.open, c.close, c.low) &&
        c.low <= Math.min(c.open, c.close, c.high) &&
        c.low > 0 &&
        c.volume >= 0
      )
      .sort((a, b) => a.openTime - b.openTime)
      .filter((c, i, arr) => i === 0 || c.openTime !== arr[i - 1].openTime);

    if (candles.length < 10) {
      return Response.json(
        { success: false, error: "Not enough completed candles from provider" },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(
      {
        success: true,
        source: "bybit",
        marketType: "PERPETUAL",
        symbol,
        timeframe,
        fetchedAt: new Date(now).toISOString(),
        candles,
      },
      { headers: { "Cache-Control": "private, max-age=0, no-store" } }
    );
  } catch {
    // Do not leak internal details or silently replace failed market data with invented candles.
    return Response.json(
      { success: false, error: "Bybit candle feed unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
