/**
 * Pure validation/normalization for public Bybit linear contract snapshots.
 * No synthetic prices, no persistence, and no broker/account credentials.
 */
import type { BybitKline } from "@/lib/market-data/bybit";
import {CRYPTO_SYMBOLS} from "@/lib/trading/v2/symbol-registry";
import type { BybitTicker } from "@/lib/market-data/bybit-ticker";

export const WATCH_SYMBOLS = CRYPTO_SYMBOLS;
export type WatchSymbol = (typeof WATCH_SYMBOLS)[number];

export type VerifiedWatchQuote = {
  symbol: WatchSymbol;
  price: number;
  change24hPercent: number;
  fetchedAt: string;
  provider: "bybit-linear";
  /** Completed 1-hour closes, oldest to newest; null if feed is invalid/too old. */
  sparkline: number[] | null;
};

export function normalizeCompletedHourlyCloses(rows: BybitKline[], now: number): number[] | null {
  const hour = 3_600_000;
  const seen = new Set<number>();
  const candles = rows
    .map(row => ({
      time: Number(row.openTime),
      high: Number(row.high), low: Number(row.low),
      open: Number(row.open), close: Number(row.close),
    }))
    .filter(c =>
      Number.isFinite(c.time) && c.time > 0 && c.time % hour === 0 &&
      c.time + hour <= now && !seen.has(c.time) &&
      [c.open,c.high,c.low,c.close].every(v => Number.isFinite(v) && v > 0) &&
      c.high >= Math.max(c.open,c.close,c.low) &&
      c.low <= Math.min(c.open,c.close,c.high)
    )
    .sort((a,b)=>a.time-b.time);
  // Deduplicate AFTER sorting. Do not fill missing candles with interpolated data.
  const unique = candles.filter(c => {
    if (seen.has(c.time)) return false;
    seen.add(c.time);
    return true;
  });
  const recent = unique.slice(-14);
  if (recent.length < 8 || now - (recent[recent.length - 1].time + hour) > hour * 3) return null;
  for (let i=1;i<recent.length;i++) {
    if (recent[i].time-recent[i-1].time !== hour) return null;
  }
  return recent.map(c=>c.close);
}

export function normalizeWatchQuote({
  symbol,ticker,rows,now,
}:{
  symbol: WatchSymbol;
  ticker: BybitTicker;
  rows: BybitKline[] | null;
  now: number;
}):VerifiedWatchQuote {
  if (!WATCH_SYMBOLS.includes(symbol) || ticker.symbol!==symbol ||
      !Number.isFinite(ticker.lastPrice) || ticker.lastPrice<=0 ||
      !Number.isFinite(ticker.price24hChange) || Math.abs(ticker.price24hChange)>10000 ||
      !Number.isFinite(now) || now<=0) {
    throw new Error("Invalid Bybit market snapshot");
  }
  return {
    symbol,
    price:ticker.lastPrice,
    change24hPercent:ticker.price24hChange,
    fetchedAt:new Date(now).toISOString(),
    provider:"bybit-linear",
    sparkline:rows?normalizeCompletedHourlyCloses(rows,now):null,
  };
}
