import assert from "node:assert/strict";
import test from "node:test";
import { calculateKeyLevels } from "../lib/trading/v2/key-levels.ts";

function fixture(highs, lows, close=100) {
  return highs.map((h,i)=>({high:h,low:lows[i],close:i===highs.length-1?close:(h+lows[i])/2}));
}
test("resistance/support are derived strictly from completed swing pivots",()=>{
  const highs=[101,102,106,102,101,103,104,108,104,102,101,100,99,100,101,100];
  const lows =[ 97, 96, 95, 97, 96, 95, 94, 93, 94, 95, 96, 97,95, 94, 96, 98];
  const l=calculateKeyLevels(fixture(highs,lows,100));
  assert.equal(l.method,"completed-candle-swings");
  assert.equal(l.referenceClose,100);
  assert.equal(l.r1,106);
  assert.equal(l.r2,108);
  assert.equal(l.s1,94);
  assert.equal(l.s2,93);
});
test("no fabricated levels if no confirmed swing occurs",()=>{
  const arr=Array.from({length:25},(_,i)=>({high:101+i,low:99+i,close:100+i}));
  const l=calculateKeyLevels(arr);
  assert.deepEqual([l.r1,l.r2,l.s1,l.s2],[null,null,null,null]);
});
test("unconfirmed last two candles cannot become pivots",()=>{
  const highs=[101,102,103,104,105,110,106];
  const lows =[ 98, 98, 98, 98, 98, 98, 98];
  const l=calculateKeyLevels(fixture(highs,lows,100));
  assert.equal(l.r1,null);
});
test("levels reject invalid or insufficient OHLC candles",()=>{
  assert.throws(()=>calculateKeyLevels([]),/incomplete/);
  assert.throws(()=>calculateKeyLevels(Array.from({length:8},()=>({high:99,low:100,close:100}))),/incomplete/);
});
test("nearest levels remain on correct side of last completed close",()=>{
  const highs=[105,108,106,109,105,104,106,108,105,104,107,105,103];
  const lows=[93,94,92,95,91,89,93,90,94,92,93,94,95];
  const l=calculateKeyLevels(fixture(highs,lows,100));
  assert.ok(l.r1===null||l.r1>100);
  assert.ok(l.r2===null||l.r2>l.r1);
  assert.ok(l.s1===null||l.s1<100);
  assert.ok(l.s2===null||l.s2<l.s1);
});
