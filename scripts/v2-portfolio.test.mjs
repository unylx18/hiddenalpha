import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_PORTFOLIO, calculatePortfolioAnalytics, decodeManualPortfolio,
  exportHoldingsCsv, importHoldingsCsv, validateManualPortfolio,
  validateTrackedHolding,
} from "../lib/trading/v2/portfolio.ts";

const at = "2025-01-15T10:00:00.000Z";
const btc = {
  id:"btc-001", symbol:"BTCUSDT", quantity:2, costPerUnitUsd:100,
  markPerUnitUsd:150, markedAt:at,
};
const eth = {
  id:"eth-001", symbol:"ETHUSDT", quantity:5, costPerUnitUsd:50,
  markPerUnitUsd:40, markedAt:at,
};
function portfolio(holdings=[],cashUsd=0) {
  return validateManualPortfolio({version:1,cashUsd,holdings});
}

test("empty portfolio shows zero values and no invented return or allocation",()=>{
  const a=calculatePortfolioAnalytics(EMPTY_PORTFOLIO);
  assert.equal(a.holdingCount,0);
  assert.equal(a.markedPortfolioValueUsd,0);
  assert.equal(a.unrealizedPnlUsd,0);
  assert.equal(a.unrealizedReturnPercent,null);
  assert.equal(a.cashAllocationPercent,null);
  assert.deepEqual(a.instrumentAllocations,[]);
});

test("manual cash/holdings allocation and unrealized P&L are separate",()=>{
  const a=calculatePortfolioAnalytics(portfolio([btc,eth],500));
  assert.equal(a.holdingCount,2);
  assert.equal(a.markedHoldingsValueUsd,500);
  assert.equal(a.cashUsd,500);
  assert.equal(a.markedPortfolioValueUsd,1000);
  assert.equal(a.costBasisUsd,450);
  assert.equal(a.unrealizedPnlUsd,50);
  assert.equal(a.cashAllocationPercent,50);
  assert.equal(a.instrumentAllocations.find(x=>x.symbol==="BTCUSDT")?.percent,30);
  assert.equal(a.instrumentAllocations.find(x=>x.symbol==="ETHUSDT")?.percent,20);
  assert.ok(Math.abs(a.unrealizedReturnPercent-50/450*100)<1e-10);
});

test("more than one manually tracked entry per symbol aggregates correctly",()=>{
  const a=calculatePortfolioAnalytics(portfolio([btc,{...btc,id:"btc-002",quantity:1,markPerUnitUsd:200}],100));
  assert.equal(a.holdingCount,2);
  assert.equal(a.instrumentAllocations.length,1);
  assert.equal(a.instrumentAllocations[0].markedValueUsd,500);
  assert.equal(a.instrumentAllocations[0].percent,500/600*100);
});

test("cash-only portfolio displays 100% cash, without a fake holdings return",()=>{
  const a=calculatePortfolioAnalytics(portfolio([],100));
  assert.equal(a.markedPortfolioValueUsd,100);
  assert.equal(a.cashAllocationPercent,100);
  assert.equal(a.unrealizedReturnPercent,null);
});

test("manual spot-like XAU ounces use USD per ounce, no broker lot assumptions",()=>{
  const a=calculatePortfolioAnalytics(portfolio([{
    id:"gold-one",symbol:"XAUUSD",quantity:2,costPerUnitUsd:2800,
    markPerUnitUsd:3000,markedAt:at,
  }]));
  assert.equal(a.markedHoldingsValueUsd,6000);
  assert.equal(a.unrealizedPnlUsd,400);
});

test("validation rejects bad marks, amounts, duplicates, unsupported symbols",()=>{
  assert.throws(()=>validateTrackedHolding({...btc,quantity:0}),/greater than zero/);
  assert.throws(()=>validateTrackedHolding({...btc,markPerUnitUsd:NaN}),/finite/);
  assert.throws(()=>validateTrackedHolding({...btc,symbol:"TSLA"}),/Unsupported holding symbol/);
  assert.throws(()=>validateTrackedHolding({...btc,markedAt:"2030-01-01T00:00:00.000Z"}),/future/);
  assert.throws(()=>portfolio([btc,btc]),/duplicate IDs/);
  assert.throws(()=>portfolio([btc],-1),/nonnegative/);
  assert.throws(()=>portfolio([btc],Infinity),/nonnegative/);
});

test("JSON full portfolio backup retains cash and holdings; invalid data rejected",()=>{
  const original=portfolio([btc,eth],1234);
  assert.deepEqual(decodeManualPortfolio(JSON.stringify(original)),original);
  assert.throws(()=>decodeManualPortfolio("not JSON"));
  assert.throws(()=>decodeManualPortfolio(JSON.stringify({...original,version:2})),/version/);
});

test("CSV holdings roundtrip preserves mark prices, timestamps and IDs",()=>{
  const holdings=portfolio([btc,eth],500).holdings;
  const csv=exportHoldingsCsv(holdings);
  assert.match(csv,/id,symbol,quantity,costPerUnitUsd,markPerUnitUsd,markedAt/);
  assert.deepEqual(importHoldingsCsv(csv),holdings);
});

test("CSV imports reject malformed headers, empty required fields and duplicate IDs",()=>{
  assert.throws(()=>importHoldingsCsv("bad,header\nvalue"),/header/);
  const sample=exportHoldingsCsv([btc]);
  assert.throws(()=>importHoldingsCsv(sample+"bad,row\r\n"),/invalid column count/);
  assert.throws(()=>importHoldingsCsv(sample+sample.split("\r\n")[1]+"\r\n"),/duplicate holding IDs/);
  const blankCost=sample.replace(',"100",',',"",');
  assert.throws(()=>importHoldingsCsv(blankCost),/Average cost per unit/);
});
