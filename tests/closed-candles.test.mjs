import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { completedCandlesNewestFirst, assertRecentCompletedCandle } from "../lib/market-data/closed-candles.ts";

const now = Date.parse("2026-11-19T12:00:30Z");

test("a still-forming 1m candle is excluded", () => {
  const newestFirst = [
    { timestamp: "2026-11-19T12:00:00Z", close: 101 },
    { timestamp: "2026-11-19T11:59:00Z", close: 100 },
  ];
  assert.deepEqual(completedCandlesNewestFirst(newestFirst, "1m", now), [newestFirst[1]]);
});

test("a fully closed newest candle is retained", () => {
  const newestFirst = [
    { timestamp: "2026-11-19T11:59:00Z", close: 101 },
    { timestamp: "2026-11-19T11:58:00Z", close: 100 },
  ];
  assert.deepEqual(completedCandlesNewestFirst(newestFirst, "1m", now), newestFirst);
});

test("multi-minute candle boundaries are respected", () => {
  const candles = [{ timestamp: "2026-11-19T11:58:00Z" }, { timestamp: "2026-11-19T11:55:00Z" }];
  assert.deepEqual(completedCandlesNewestFirst(candles, "3m", now), [candles[1]]);
});

test("unsupported timeframe fails closed", () => {
  assert.throws(() => completedCandlesNewestFirst([{ timestamp: "2026-11-19T11:59:00Z" }], "1M", now), /Unsupported/);
});

test("recent completed data passes the freshness gate", () => {
  assert.doesNotThrow(() => assertRecentCompletedCandle(
    [{ timestamp: "2026-11-19T11:59:00Z" }], "1m", now
  ));
});

test("stale completed data cannot create new signals", () => {
  assert.throws(() => assertRecentCompletedCandle(
    [{ timestamp: "2026-11-19T11:40:00Z" }], "1m", now
  ), /Stale/);
});

test("all privileged mutation handlers require server authorization", () => {
  const paths = [
    "app/api/market/sync/route.ts",
    "app/api/trading/pipeline/route.ts",
    "app/api/trading/publisher/route.ts",
    "app/api/trading/signals/save/route.ts",
    "app/api/trading/signals/lifecycle/route.ts",
    "app/api/trading/signals/monitor/route.ts",
    "app/api/trading/signals/status/route.ts",
  ];
  for (const path of paths) {
    const code = readFileSync(path, "utf8");
    assert.match(code, /authorizeMutation\(request\)/, `Missing authorization: ${path}`);
  }
  const browser = readFileSync("components/market-auto-sync.tsx", "utf8");
  assert.doesNotMatch(browser, /fetch\(\s*["']\/api\/market\/sync["']/, "Browser must not call privileged sync endpoint");
});
