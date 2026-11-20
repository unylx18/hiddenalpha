import { getBybitTicker } from "@/lib/market-data/bybit-ticker";
import { getBybitKlines } from "@/lib/market-data/bybit";
import {
  WATCH_SYMBOLS, normalizeWatchQuote, type VerifiedWatchQuote,
} from "@/lib/trading/v2/market-watch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A fixed three-symbol, read-only endpoint. All upstream calls are time bounded.
// Per-instance cache + inflight coalescing is a best-effort cost guard,
// not a distributed rate limiter or financial price oracle.
const TTL_MS = 60_000;
let cache: { items: VerifiedWatchQuote[]; expiresAt: number } | null = null;
let inFlight: Promise<VerifiedWatchQuote[]> | null = null;

async function readSymbol(symbol: (typeof WATCH_SYMBOLS)[number]): Promise<VerifiedWatchQuote> {
  const ticker = await getBybitTicker(symbol, AbortSignal.timeout(8_000));
  let candles = null;
  try {
    candles = await getBybitKlines(symbol, "60", 16, undefined, AbortSignal.timeout(8_000));
  } catch {
    // A missing sparkline must not invalidate a genuine current market quote.
  }
  return normalizeWatchQuote({ symbol, ticker, rows: candles, now: Date.now() });
}

async function readAll(): Promise<VerifiedWatchQuote[]> {
  const settled = await Promise.allSettled(WATCH_SYMBOLS.map(readSymbol));
  return settled.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
}

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return Response.json({ success: true, provider: "bybit-linear", items: cache.items, cache: "HIT" },
      {headers:{"Cache-Control":"no-store"}});
  }
  const joined = Boolean(inFlight);
  if (!inFlight) {
    inFlight = readAll().then(items => {
      if (items.length) cache = {items,expiresAt:Date.now()+TTL_MS};
      return items;
    }).finally(() => { inFlight = null; });
  }
  try {
    const items = await inFlight;
    if (!items.length) return Response.json({
      success:false,provider:"bybit-linear",items:[],error:"Public market snapshot unavailable",
    },{status:503,headers:{"Cache-Control":"no-store"}});
    return Response.json({success:true,provider:"bybit-linear",items,cache:joined?"COALESCED":"MISS"},
      {headers:{"Cache-Control":"no-store"}});
  } catch {
    return Response.json({
      success:false,provider:"bybit-linear",items:[],error:"Public market snapshot unavailable",
    },{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
