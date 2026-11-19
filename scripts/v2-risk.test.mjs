import assert from "node:assert/strict";
import test from "node:test";
import { calculateV2PositionSize } from "../lib/trading/v2/position-sizing.ts";

const crypto = {
  symbol: "BTCUSDT", direction: "LONG", equityUsd: 1000,
  riskPercent: 1, entry: 100000, stop: 99000, target: 102000,
  roundTripFeesBps: 10, slippageBps: 5, cryptoQuantityStep: 0.000001,
};

test("crypto sizing stays within risk budget after fees/slippage", () => {
  const result = calculateV2PositionSize(crypto);
  assert.ok(result.quantity > 0);
  assert.ok(result.estimatedStopLossUsd <= result.riskBudgetUsd + 1e-7);
  assert.ok(result.estimatedStopLossUsd > 0);
  assert.ok(result.estimatedTargetNetUsd > 0);
  assert.equal(result.market, "crypto");
  assert.equal(result.lots, null);
});

test("Forex EURUSD lot conversion uses explicit broker contract size", () => {
  const result = calculateV2PositionSize({
    symbol: "EURUSD", direction: "LONG", equityUsd: 10000, riskPercent: 1,
    entry: 1.10, stop: 1.095, target: 1.11,
    roundTripFeesBps: 0, slippageBps: 0,
    contractUnitsPerLot: 100000, lotStep: 0.01,
  });
  assert.equal(result.market, "forex");
  assert.ok(Math.abs(result.lots - 0.2) < 1e-9);
  assert.ok(Math.abs(result.estimatedStopLossUsd - 100) < 1e-8);
  assert.ok(Math.abs(result.grossRiskReward - 2) < 1e-8);
});

test("XAUUSD requires an explicit ounces-per-lot contract, never assumes 100", () => {
  assert.throws(() => calculateV2PositionSize({
    symbol: "XAUUSD", direction: "LONG", equityUsd: 10000, riskPercent: 1,
    entry: 3000, stop: 2990, roundTripFeesBps: 0, slippageBps: 0,
  }), /contract units per lot/);
});

test("Forex lot increment rounds down rather than violating risk", () => {
  const result = calculateV2PositionSize({
    symbol: "XAUUSD", direction: "SHORT", equityUsd: 10000, riskPercent: 1,
    entry: 3000, stop: 3010, target: 2980, roundTripFeesBps: 0, slippageBps: 0,
    contractUnitsPerLot: 100, lotStep: 0.03,
  });
  assert.ok(result.estimatedStopLossUsd <= result.riskBudgetUsd);
  assert.equal(result.lots, 0.09);
});

test("rejects invalid risk, stop direction, and numeric values", () => {
  assert.throws(() => calculateV2PositionSize({...crypto, riskPercent: 6}), /Maximum modeled risk/);
  assert.throws(() => calculateV2PositionSize({...crypto, stop: 101000}), /LONG stop/);
  assert.throws(() => calculateV2PositionSize({...crypto, entry: Number.NaN}), /finite/);
  assert.throws(() => calculateV2PositionSize({...crypto, cryptoQuantityStep: 0}), /above zero/);
  assert.throws(() => calculateV2PositionSize({...crypto, equityUsd: 1, riskPercent: .1, cryptoQuantityStep: 1}), /too small/);
});
