/**
 * Run after Next.js build. Starts the actual production server, checks V2
 * routes and API input validation without external market requests.
 * Stops the child on success or failure.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const port = Number(process.env.V2_SMOKE_PORT || 39321);
const base = "http://127.0.0.1:" + port;
const app = spawn(process.execPath, [
  "node_modules/next/dist/bin/next", "start", "-p", String(port),
], { env: process.env, stdio: "ignore" });
let cleanupStarted = false;
function cleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  app.kill("SIGTERM");
}
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });
async function get(path) {
  return fetch(base + path, {
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (app.exitCode !== null) throw new Error("Built Next.js server exited unexpectedly");
    try {
      const response = await get("/v2");
      if (response.status === 200) { ready = true; break; }
    } catch { /* server may still be starting */ }
    await sleep(500);
  }
  assert.equal(ready, true, "Built Next.js server was not ready within 25s");

  for (const [path, marker] of [
    ["/v2", "Market Command Center"],
    ["/v2/scanner", "Crypto Market Scanner"],
    ["/v2/portfolio", "Portfolio Analytics"],
    ["/v2/journal", "Trading Journal"],
    ["/v2/risk", "Risk Manager"],
  ]) {
    const response = await get(path);
    assert.equal(response.status, 200, path + " returned HTTP " + response.status);
    assert.match(await response.text(), new RegExp(marker, "i"));
    console.log("PASS built-server route", path);
  }

  const response = await get("/api/v2/analysis?symbol=INVALID&timeframe=15m");
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(response.headers.get("cache-control"), "no-store");
  console.log("PASS API rejects unsupported symbol without calling Bybit");
  console.log("V2 built-server HTTP smoke PASSED");
} finally {
  cleanup();
  await sleep(400);
  if (app.exitCode === null) app.kill("SIGKILL");
}
