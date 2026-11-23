import assert from "node:assert/strict";
import test from "node:test";
import {CRYPTO_SYMBOLS} from "../lib/trading/v2/symbol-registry.ts";
import {
  parseScannerResponse,filterSortScans,decodeScannerChartLink,
  mapWithConcurrency,deriveMtfVerdict,isScannerResultFresh,matchesScanCondition,
} from "../lib/trading/v2/market-scanner-model.ts";
const now=Date.parse("2026-11-20T07:00:30Z");
const sample=(symbol="BTCUSDT",timeframe="15m",bias="BULLISH",score=54)=>({
  success:true,provider:"bybit",architecture:"stateless-on-demand",
  marketType:"crypto",volumeKind:"traded_contracts",candleCount:300,
  lastClosedAt:"2026-11-20T07:00:00.000Z",
  alpha:{symbol,timeframe,market:{bias,score,confidence:72},
    trend:{direction:bias},momentum:{direction:bias},
    volatility:{level:"NORMAL"},volume:{ratio:1.7}},
});
test("scanner validates genuine closed-candle context",()=>{
  assert.equal(parseScannerResponse(sample(),"BTCUSDT","15m",now)?.score,54);
  assert.equal(parseScannerResponse({...sample(),provider:"oanda"},"BTCUSDT","15m",now),null);
  assert.equal(parseScannerResponse(sample("SOLUSDT"),"BTCUSDT","15m",now),null);
  assert.equal(parseScannerResponse(sample(),"BTCUSDT","15m",now+5_000_000),null);
  assert.equal(parseScannerResponse(sample(),"BTCUSDT","15m",now-120_000),null);
  assert.equal(parseScannerResponse({...sample(),candleCount:199},"BTCUSDT","15m",now),null);
});
test("sorted rankings use actual signed score, no invented probability",()=>{
  const rows=[
    parseScannerResponse(sample("BTCUSDT","15m","BULLISH",43),"BTCUSDT","15m",now),
    parseScannerResponse(sample("ETHUSDT","15m","BEARISH",-70),"ETHUSDT","15m",now),
  ].filter(Boolean);
  assert.deepEqual(filterSortScans(rows,"ALL","absolute").map(x=>x.symbol),["ETHUSDT","BTCUSDT"]);
});
test("scanner deep link validates strict allowlist",()=>{
  assert.deepEqual(decodeScannerChartLink("?symbol=DOTUSDT&timeframe=4h"),
    {symbol:"DOTUSDT",timeframe:"4h"});
  assert.equal(decodeScannerChartLink("?symbol=BADUSDT&timeframe=4h"),null);
  assert.equal(decodeScannerChartLink("?symbol=BTCUSDT&timeframe=1m"),null);
  assert.equal(decodeScannerChartLink("?symbol=BTCUSDT&symbol=ETHUSDT&timeframe=1h"),null);
  assert.equal(CRYPTO_SYMBOLS.length,12);
});
test("manual scan concurrency never exceeds three",async()=>{
  let concurrent=0,max=0;
  await mapWithConcurrency(Array.from({length:12},(_,i)=>i),99,async()=>{
    concurrent++;max=Math.max(max,concurrent);
    await new Promise(resolve=>setTimeout(resolve,1));concurrent--;
  });
  assert.equal(max,3);
});
test("cancelled scanner stops starting new requests",async()=>{
  const ac=new AbortController();let hits=0;
  await mapWithConcurrency(Array.from({length:12},(_,i)=>i),2,async()=>{hits++;ac.abort();},ac.signal);
  assert.equal(hits,1);
});
test("MTF requires 3 different frames, same symbol and common directional bias",()=>{
  const rows=["15m","1h","4h"].map(tf=>{
    const d=sample("BTCUSDT",tf);
    return parseScannerResponse(d,"BTCUSDT",tf,now);
  }).filter(Boolean);
  assert.equal(deriveMtfVerdict("BTCUSDT",rows),"ALIGNED BULLISH");
  assert.equal(deriveMtfVerdict("BTCUSDT",rows.slice(0,2)),"UNAVAILABLE");
  assert.equal(deriveMtfVerdict("ETHUSDT",rows),"UNAVAILABLE");
  assert.equal(deriveMtfVerdict("BTCUSDT",[
    rows[0],{...rows[1],bias:"NEUTRAL"},rows[2],
  ]),"MIXED / NO TRADE");
});

test("source enum validation rejects unrecognized trend, momentum and volatility",()=>{
  assert.equal(parseScannerResponse({
    ...sample(),alpha:{...sample().alpha,trend:{direction:"UNKNOWN"}},
  },"BTCUSDT","15m",now),null);
  assert.equal(parseScannerResponse({
    ...sample(),alpha:{...sample().alpha,momentum:{direction:"BUY NOW"}},
  },"BTCUSDT","15m",now),null);
  assert.equal(parseScannerResponse({
    ...sample(),alpha:{...sample().alpha,volatility:{level:"EXTREME"}},
  },"BTCUSDT","15m",now),null);
});
test("freshness expires and never displays future or invalid scanner candles",()=>{
  const row=parseScannerResponse(sample(),"BTCUSDT","15m",now);
  assert.equal(isScannerResultFresh(row,now),true);
  assert.equal(isScannerResultFresh(row,now+2_000_000),false);
  assert.equal(isScannerResultFresh(row,now-120_000),false);
});
test("context filters need real trend+momentum agreement, never just a score",()=>{
  const bullish=parseScannerResponse(sample("BTCUSDT","15m","BULLISH",40),"BTCUSDT","15m",now);
  const bearish=parseScannerResponse(sample("ETHUSDT","15m","BEARISH",-42),"ETHUSDT","15m",now);
  const mixed={...bullish,momentum:"NEUTRAL",relativeVolume:0.6};
  assert.equal(matchesScanCondition(bullish,"TREND_MOMENTUM"),true);
  assert.equal(matchesScanCondition(mixed,"TREND_MOMENTUM"),false);
  assert.equal(matchesScanCondition(mixed,"VOLUME_1X"),false);
  assert.equal(matchesScanCondition(bullish,"VOLUME_1X"),true);
  assert.deepEqual(
    filterSortScans([mixed,bearish],"ALL","absolute","TREND_MOMENTUM").map(x=>x.symbol),
    ["ETHUSDT"],
  );
});
