/**
 * OANDA v20 read-only candle adapter for Hidden Alpha V2.
 *
 * OANDA_API_TOKEN / OANDA_ACCOUNT_ID are server-only secrets.
 * This file never places orders or persists market data.
 * OANDA candle "volume" means number of price updates, NOT traded quantity.
 *
 * Reference: https://developer.oanda.com/rest-live-v20/pricing-ep/
 */
export type ForexSymbol = "XAUUSD" | "EURUSD" | "GBPUSD";

export type ForexCandle = {
  timestamp: string;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export class OandaConfigMissing extends Error {
  constructor() {
    super("Forex provider not configured. Set OANDA_API_TOKEN and OANDA_ACCOUNT_ID on the server.");
  }
}

export class OandaDataUnavailable extends Error {
  constructor(message = "OANDA market data unavailable") {
    super(message);
  }
}

const PAIRS: Record<ForexSymbol, string> = {
  XAUUSD: "XAU_USD",
  EURUSD: "EUR_USD",
  GBPUSD: "GBP_USD",
};

// OANDA does not list native M3 in the current public granularity table.
// Aggregate three *actual completed M1 candles* into each 3m interval.
const GRANULARITIES: Record<string, string> = {
  "1m": "M1",
  "3m": "M1",
  "5m": "M5",
  "15m": "M15",
  "1h": "H1",
  "4h": "H4",
  "1d": "D",
};

type RawOandaCandle = {
  time?: unknown;
  complete?: unknown;
  volume?: unknown;
  mid?: { o?: unknown; h?: unknown; l?: unknown; c?: unknown };
};

function parseCandle(item: RawOandaCandle): ForexCandle | null {
  if (item.complete !== true || typeof item.time !== "string" || !item.mid) return null;
  const openTime = Date.parse(item.time);
  const open = Number(item.mid.o);
  const high = Number(item.mid.h);
  const low = Number(item.mid.l);
  const close = Number(item.mid.c);
  const volume = Number(item.volume);
  if (!Number.isFinite(openTime) || openTime <= 0 ||
      ![open, high, low, close, volume].every(Number.isFinite) ||
      low <= 0 || volume < 0 ||
      high < Math.max(open, close, low) ||
      low > Math.min(open, close, high)) return null;
  return { timestamp: new Date(openTime).toISOString(), openTime, open, high, low, close, volume };
}

/**
 * Actual 3-minute OHLCV is aggregated only from three consecutive complete
 * OANDA M1 bars, never interpolated or fabricated. Weekend gaps are skipped.
 */
function aggregateThreeMinuteCandles(minutes: ForexCandle[]): ForexCandle[] {
  const period = 180_000;
  const buckets = new Map<number, ForexCandle[]>();
  for (const candle of minutes) {
    const start = Math.floor(candle.openTime / period) * period;
    const group = buckets.get(start) ?? [];
    group.push(candle);
    buckets.set(start, group);
  }
  const result: ForexCandle[] = [];
  for (const [start, group] of buckets) {
    group.sort((a,b) => a.openTime-b.openTime);
    if (group.length !== 3 ||
        group.some((c,i) => c.openTime !== start + i*60_000)) continue;
    const first = group[0], last = group[2];
    result.push({
      timestamp: new Date(start).toISOString(),
      openTime: start,
      open: first.open,
      high: Math.max(...group.map(x=>x.high)),
      low: Math.min(...group.map(x=>x.low)),
      close: last.close,
      volume: group.reduce((n,x)=>n+x.volume,0),
    });
  }
  return result.sort((a,b)=>a.openTime-b.openTime);
}

export function isForexSymbol(symbol: string): symbol is ForexSymbol {
  return Object.prototype.hasOwnProperty.call(PAIRS, symbol);
}

export function supportedForexTimeframe(timeframe: string): boolean {
  return Object.prototype.hasOwnProperty.call(GRANULARITIES, timeframe);
}

export async function getOandaCompletedCandles(
  symbol: ForexSymbol,
  timeframe: string,
  limit = 310
): Promise<ForexCandle[]> {
  const token = process.env.OANDA_API_TOKEN;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  if (!token || !accountId) throw new OandaConfigMissing();

  const instrument = PAIRS[symbol];
  const granularity = GRANULARITIES[timeframe];
  if (!instrument || !granularity) throw new OandaDataUnavailable("Unsupported Forex instrument or timeframe");

  const host = process.env.OANDA_ENV === "live"
    ? "https://api-fxtrade.oanda.com"
    : "https://api-fxpractice.oanda.com";

  const url = new URL(
    "/v3/accounts/" + encodeURIComponent(accountId) +
    "/instruments/" + encodeURIComponent(instrument) + "/candles",
    host
  );
  url.searchParams.set("granularity", granularity);
  url.searchParams.set("price", "M");
  url.searchParams.set("count", String(timeframe === "3m" ? 1000 : Math.min(500, Math.max(210, limit))));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      "Accept-Datetime-Format": "RFC3339",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    // Avoid echoing credential, account or provider response internals to users.
    throw new OandaDataUnavailable(
      response.status === 401 || response.status === 403
        ? "OANDA credentials are invalid or not authorized"
        : response.status === 404
        ? "OANDA instrument unavailable for this account"
        : "OANDA market data request failed"
    );
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new OandaDataUnavailable("OANDA response invalid");
  const data = payload as Record<string, unknown>;
  if (data.instrument !== instrument || data.granularity !== granularity ||
      !Array.isArray(data.candles)) throw new OandaDataUnavailable("Unexpected OANDA candle response");

  const candles = data.candles
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      return parseCandle(item as RawOandaCandle);
    })
    .filter((c): c is ForexCandle => c !== null)
    .sort((a, b) => a.openTime - b.openTime)
    .filter((c, i, arr) => i === 0 || c.openTime !== arr[i - 1].openTime);
  return timeframe === "3m" ? aggregateThreeMinuteCandles(candles) : candles;
}
