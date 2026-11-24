import { getBybitTicker } from "@/lib/market-data/bybit-ticker";
import { getBybitKlines } from "@/lib/market-data/bybit";
import {
  WATCH_SYMBOLS, normalizeWatchQuote, type VerifiedWatchQuote, type WatchSymbol,
} from "@/lib/trading/v2/market-watch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Read-only allowlisted feed. Per-instance cache limits repeated public calls;
// it is NOT a distributed rate limiter. Only three core assets fetch sparklines.
const TTL_MS = 60_000;
const SPARKLINE_SYMBOLS = new Set<string>(["BTCUSDT","ETHUSDT","SOLUSDT"]);
let cache:{items:VerifiedWatchQuote[];expiresAt:number}|null=null;
let inFlight:Promise<VerifiedWatchQuote[]>|null=null;
async function readSymbol(symbol:WatchSymbol):Promise<VerifiedWatchQuote>{
  const ticker = await getBybitTicker(symbol,AbortSignal.timeout(6_000));
  let rows=null;
  if(SPARKLINE_SYMBOLS.has(symbol)){
    try {
      rows=await getBybitKlines(symbol,"60",16,undefined,AbortSignal.timeout(5_000));
    }catch { /* Verified ticker remains usable if hourly candles fail. */ }
  }
  return normalizeWatchQuote({symbol,ticker,rows,now:Date.now()});
}
async function readAll():Promise<VerifiedWatchQuote[]>{
  const output:VerifiedWatchQuote[]=[];
  let index=0;
  // Three concurrent workers avoid a single burst of twelve upstream calls.
  await Promise.all(Array.from({length:3},async()=>{
    while(index<WATCH_SYMBOLS.length){
      const symbol=WATCH_SYMBOLS[index++];
      try { output.push(await readSymbol(symbol)); } catch { /* unavailable */ }
    }
  }));
  return output;
}
export async function GET(){
  const now=Date.now();
  if(cache&&cache.expiresAt>now){
    return Response.json({success:true,provider:"bybit-linear",items:cache.items,cache:"HIT"},
      {headers:{"Cache-Control":"no-store"}});
  }
  const joined=Boolean(inFlight);
  if(!inFlight){
    inFlight=readAll().then(items=>{
      if(items.length)cache={items,expiresAt:Date.now()+TTL_MS};
      return items;
    }).finally(()=>{inFlight=null;});
  }
  try {
    const items=await inFlight;
    if(!items.length)return Response.json({
      success:false,provider:"bybit-linear",items:[],error:"Public market snapshot unavailable",
    },{status:503,headers:{"Cache-Control":"no-store"}});
    return Response.json({success:true,provider:"bybit-linear",items,cache:joined?"COALESCED":"MISS"},
      {headers:{"Cache-Control":"no-store"}});
  }catch {
    return Response.json({
      success:false,provider:"bybit-linear",items:[],error:"Public market snapshot unavailable",
    },{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
