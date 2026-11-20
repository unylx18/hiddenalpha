/**
 * Hidden Alpha V2 smoke checks (Node 20+; no extra packages).
 *
 * Start the app with "npm run dev" or "npm run start", then:
 *   node scripts/v2-smoke.mjs
 *   node scripts/v2-smoke.mjs --live
 *   node scripts/v2-smoke.mjs --forex
 *
 * The default checks do NOT contact Bybit or modify any data.
 * --live makes a read-only, real provider request; it may fail if Bybit is unavailable.
 */
import assert from "node:assert/strict";

const live = process.argv.includes("--live");
const base = (process.env.V2_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
let failures = 0;

async function check(name, task) {
  try {
    await task();
    console.log("PASS", name);
  } catch (error) {
    failures++;
    console.error("FAIL", name, error instanceof Error ? error.message : error);
  }
}

async function call(path) {
  const response = await fetch(base + path, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(14_000),
    cache: "no-store",
  });
  const body = await response.json();
  return { response, body };
}

await check("V2 portfolio analytics route exists", async () => {
  const res = await fetch(base + "/v2/portfolio", { signal: AbortSignal.timeout(8_000) });
  assert.equal(res.status, 200, "GET /v2/portfolio returned " + res.status);
  assert.match(await res.text(), /Portfolio Analytics/i);
});

await check("V2 trading journal route exists", async () => {
  const res = await fetch(base + "/v2/journal", { signal: AbortSignal.timeout(8_000) });
  assert.equal(res.status, 200, "GET /v2/journal returned " + res.status);
  assert.match(await res.text(), /Trading Journal/i);
});

await check("V2 risk manager route exists", async () => {
  const res = await fetch(base + "/v2/risk", { signal: AbortSignal.timeout(8_000) });
  assert.equal(res.status, 200, "GET /v2/risk returned " + res.status);
  assert.match(await res.text(), /Risk Manager/i);
});

await check("V2 dashboard route exists", async () => {
  const res = await fetch(base + "/v2", { signal: AbortSignal.timeout(8_000) });
  assert.equal(res.status, 200, "GET /v2 returned " + res.status);
  assert.match(await res.text(), /HIDDEN ALPHA|Hidden Alpha/i);
});

for (const [path, label] of [
  ["/api/v2/analysis?symbol=INVALID&timeframe=15m", "invalid crypto symbol"],
  ["/api/v2/analysis?symbol=XAUUSD&timeframe=15m", "unsupported forex analysis"],
  ["/api/v2/analysis?symbol=BTCUSDT&timeframe=99m", "invalid timeframe"],
  ["/api/v2/forex/analysis?symbol=BTCUSDT&timeframe=15m", "non-Forex symbol at Forex endpoint"],
  ["/api/v2/forex/analysis?symbol=XAUUSD&timeframe=99m", "invalid Forex timeframe"],
]) {
  await check("Validation rejects " + label, async () => {
    const { response, body } = await call(path);
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
}

if (live) {
  await check("Actual Bybit BTCUSDT analysis (read-only, no Supabase)", async () => {
    const first = await call("/api/v2/analysis?symbol=BTCUSDT&timeframe=15m");
    assert.equal(first.response.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.success, true);
    assert.equal(first.body.provider, "bybit");
    assert.equal(first.body.architecture, "stateless-on-demand");
    assert.ok(first.body.candleCount >= 200);
    assert.ok(["BULLISH", "BEARISH", "NEUTRAL"].includes(first.body.alpha?.market?.bias));
    const levels = first.body.alpha?.keyLevels;
    assert.equal(levels?.method, "completed-candle-swings");
    assert.ok(Number.isFinite(levels?.referenceClose) && levels.referenceClose > 0);
    for (const key of ["r1","r2","s1","s2"]) {
      assert.ok(levels[key] === null || (Number.isFinite(levels[key]) && levels[key] > 0));
    }
    assert.ok(["BULLISH","BEARISH","NEUTRAL"].includes(first.body.alpha?.marketRegime));
    assert.ok(Number.isFinite(first.body.alpha?.market?.score));
    assert.ok(Number.isFinite(first.body.alpha?.market?.confidence));
    assert.ok(!Number.isNaN(Date.parse(first.body.lastClosedAt)));

    const second = await call("/api/v2/analysis?symbol=BTCUSDT&timeframe=15m");
    assert.equal(second.response.status, 200, JSON.stringify(second.body));
    assert.equal(second.body.success, true);
    console.log("     Cache:", first.body.cache, "->", second.body.cache);
    console.log("     Candle count:", first.body.candleCount, "last closed:", first.body.lastClosedAt);
  });
} else {
  console.log("SKIP live provider test (use --live to enable)");
}

const forex = process.argv.includes("--forex");
if (forex) {
  await check("Forex adapter status / actual provider (read-only)", async () => {
    const { response, body } = await call("/api/v2/forex/analysis?symbol=XAUUSD&timeframe=15m");
    if (response.status === 503 && /needs an OANDA v20 connection/.test(String(body.error))) {
      console.log("     OANDA credentials not configured: connector correctly disabled (HTTP 503)");
      return;
    }
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.provider, "oanda");
    assert.equal(body.marketType, "forex");
    assert.equal(body.volumeKind, "price_updates");
    assert.ok(body.candleCount >= 200);
    assert.ok(["BULLISH","BEARISH","NEUTRAL"].includes(body.alpha?.market?.bias));
    console.log("     OANDA analysis OK, candles:", body.candleCount, "last:", body.lastClosedAt);
  });
} else {
  console.log("SKIP Forex connector test (use --forex to check configured OANDA endpoint)");
}

console.log(failures ? "\nV2 smoke FAILED: " + failures + " issue(s)." : "\nV2 smoke PASSED.");
if (failures) process.exitCode = 1;
