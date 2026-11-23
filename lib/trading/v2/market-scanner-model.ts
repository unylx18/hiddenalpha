/**
 * Read-only normalization for the V2 market scanner and per-symbol multi-timeframe checks.
 * Context score is an engine indicator, NOT a probability, return forecast or trade order.
 */
import {CRYPTO_SYMBOLS,type CryptoSymbol} from "./symbol-registry";

export type ScanFrame="15m"|"1h"|"4h";
export const SCAN_FRAMES:readonly ScanFrame[]=["15m","1h","4h"];
export type ScanBias="BULLISH"|"BEARISH"|"NEUTRAL";
export type ScanFilter="ALL"|ScanBias;
export type ScanSort="absolute"|"highest"|"symbol";
export type VerifiedScan={
  symbol:CryptoSymbol;
  timeframe:ScanFrame;
  bias:ScanBias;
  score:number;
  confidence:number;
  trend:string;
  momentum:string;
  relativeVolume:number;
  volatility:string;
  lastClosedAt:string;
  candleCount:number;
};
const DURATIONS:Record<ScanFrame,number>={
  "15m":900_000,"1h":3_600_000,"4h":14_400_000,
};
function record(value:unknown):Record<string,unknown>|null{
  return value!==null&&typeof value==="object"&&!Array.isArray(value)
    ?value as Record<string,unknown>:null;
}
function finite(value:unknown):value is number{
  return typeof value==="number"&&Number.isFinite(value);
}
function label(value:unknown):value is string{
  return typeof value==="string"&&value.length>0&&value.length<=45;
}
export function isScannerSymbol(value:string):value is CryptoSymbol{
  return CRYPTO_SYMBOLS.some(id=>id===value);
}
/** Fail closed on mismatched provider, symbol, malformed data or stale candles. */
export function parseScannerResponse(
  raw:unknown,symbol:CryptoSymbol,timeframe:ScanFrame,now:number,
):VerifiedScan|null{
  if(!isScannerSymbol(symbol)||!SCAN_FRAMES.includes(timeframe)||!finite(now))return null;
  const data=record(raw),alpha=record(data?.alpha),market=record(alpha?.market);
  const trend=record(alpha?.trend),momentum=record(alpha?.momentum);
  const volume=record(alpha?.volume),volatility=record(alpha?.volatility);
  if(!data||!alpha||!market||!trend||!momentum||!volume||!volatility||
     data.success!==true||data.provider!=="bybit"||
     data.architecture!=="stateless-on-demand"||data.marketType!=="crypto"||
     data.volumeKind!=="traded_contracts"||alpha.symbol!==symbol||
     alpha.timeframe!==timeframe||!finite(data.candleCount)||data.candleCount<200||
     !["BULLISH","BEARISH","NEUTRAL"].includes(String(market.bias))||
     !finite(market.score)||market.score < -100||market.score>100||
     !finite(market.confidence)||market.confidence<0||market.confidence>100||
     !label(trend.direction)||!label(momentum.direction)||!label(volatility.level)||
     !finite(volume.ratio)||volume.ratio<0||typeof data.lastClosedAt!=="string")return null;
  const closed=Date.parse(data.lastClosedAt);
  if(!Number.isFinite(closed)||closed>now+60_000||
     now-closed>Math.max(DURATIONS[timeframe]*2,120_000))return null;
  return {
    symbol,timeframe,bias:market.bias as ScanBias,score:market.score,
    confidence:market.confidence,trend:trend.direction,
    momentum:momentum.direction,relativeVolume:volume.ratio,
    volatility:volatility.level,lastClosedAt:data.lastClosedAt,
    candleCount:data.candleCount,
  };
}
export function filterSortScans(rows:readonly VerifiedScan[],filter:ScanFilter,sort:ScanSort){
  return rows.filter(x=>filter==="ALL"||x.bias===filter)
    .sort((a,b)=>sort==="symbol"?a.symbol.localeCompare(b.symbol):
      sort==="highest"?b.score-a.score||a.symbol.localeCompare(b.symbol):
      Math.abs(b.score)-Math.abs(a.score)||a.symbol.localeCompare(b.symbol));
}
export function decodeScannerChartLink(raw:string):{symbol:CryptoSymbol;timeframe:ScanFrame}|null{
  if(raw.length>1024)return null;
  const p=new URLSearchParams(raw.startsWith("?")?raw.slice(1):raw);
  const symbol=p.get("symbol")??"",frame=p.get("timeframe")??"";
  if(p.getAll("symbol").length!==1||p.getAll("timeframe").length!==1||
     !isScannerSymbol(symbol)||!SCAN_FRAMES.includes(frame as ScanFrame))return null;
  return {symbol,timeframe:frame as ScanFrame};
}
/** Three concurrent requests maximum; respects cancellation before starting work. */
export async function mapWithConcurrency<T>(
  items:readonly T[],limit:number,job:(item:T)=>Promise<void>,signal?:AbortSignal,
):Promise<void>{
  const workers=Math.min(items.length,Math.max(1,Math.min(3,Math.trunc(limit)||1)));
  let index=0;
  await Promise.all(Array.from({length:workers},async()=>{
    while(!signal?.aborted&&index<items.length)await job(items[index++]);
  }));
}
export type MtfVerdict="ALIGNED BULLISH"|"ALIGNED BEARISH"|"MIXED / NO TRADE"|"UNAVAILABLE";
/** No alignment claim unless all three independent, fresh frames are present. */
export function deriveMtfVerdict(
  symbol:CryptoSymbol,rows:readonly VerifiedScan[],
):MtfVerdict{
  if(rows.length!==3||new Set(rows.map(x=>x.timeframe)).size!==3||
    rows.some(x=>x.symbol!==symbol)||SCAN_FRAMES.some(tf=>!rows.some(x=>x.timeframe===tf)))
    return "UNAVAILABLE";
  const first=rows[0].bias;
  if(first==="NEUTRAL"||rows.some(x=>x.bias!==first))return "MIXED / NO TRADE";
  return first==="BULLISH"?"ALIGNED BULLISH":"ALIGNED BEARISH";
}
