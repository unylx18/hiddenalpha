import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCompletedHourlyCloses, normalizeWatchQuote, WATCH_SYMBOLS,
} from "../lib/trading/v2/market-watch.ts";

const hour=3_600_000;
const now=Date.parse("2026-11-20T12:34:00.000Z");
const base=Math.floor(now/hour)*hour-15*hour;
function samples() {
  return Array.from({length:16},(_,i)=>{
    const n=100+i;
    return {
      openTime:base+i*hour,
      open:String(n),high:String(n+2),low:String(n-2),
      close:String(n+1),volume:"120",
    };
  });
}
const ticker={
  symbol:"BTCUSDT",lastPrice:93123,price24hChange:2.45,
  bidPrice:93122,askPrice:93124,markPrice:93120,
};
test("only completed hourly closes become a real chart sparkline",()=>{
  const rows=samples().reverse(); // Bybit REST returns newest first
  const closes=normalizeCompletedHourlyCloses(rows,now);
  assert.equal(closes?.length,14);
  assert.equal(closes?.at(-1),115);
  assert.equal(closes?.[0],102);
});
test("discontinuous or too-few candles produce no fabricated sparkline",()=>{
  const rows=samples();
  assert.equal(normalizeCompletedHourlyCloses(rows.slice(0,6),now),null);
  const gap=rows.filter((_,i)=>i!==8);
  assert.equal(normalizeCompletedHourlyCloses(gap,now),null);
});
test("stale market history is rejected, but validated ticker is still available",()=>{
  const old= samples().map(row=>({...row,openTime:row.openTime-10*hour}));
  assert.equal(normalizeCompletedHourlyCloses(old,now),null);
  const snapshot=normalizeWatchQuote({symbol:"BTCUSDT",ticker,rows:old,now});
  assert.equal(snapshot.price,93123);
  assert.equal(snapshot.sparkline,null);
  assert.equal(snapshot.provider,"bybit-linear");
});
test("bad OHLC and unsupported tickers do not pass as valid data",()=>{
  assert.equal(normalizeCompletedHourlyCloses(samples().map(row=>({...row,high:"1"})),now),null);
  assert.throws(()=>normalizeWatchQuote({symbol:"BTCUSDT",ticker:{...ticker,symbol:"ETHUSDT"},rows:samples(),now}),/Invalid/);
  assert.throws(()=>normalizeWatchQuote({symbol:"BTCUSDT",ticker:{...ticker,lastPrice:NaN},rows:samples(),now}),/Invalid/);
  assert.throws(()=>normalizeWatchQuote({symbol:"BTCUSDT",ticker:{...ticker,price24hChange:Infinity},rows:samples(),now}),/Invalid/);
});
test("watchlist symbol allowlist contains twelve supported Bybit linear markets",()=>{
  assert.equal(WATCH_SYMBOLS.length,12);
  assert.equal(new Set(WATCH_SYMBOLS).size,12);
  assert.deepEqual(WATCH_SYMBOLS.slice(0,3),["BTCUSDT","ETHUSDT","SOLUSDT"]);
});
