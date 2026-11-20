# Hidden Alpha V2 — lightweight trading terminal rebuild

## Architecture decision (2026-11-19)
V2 uses an official, hosted TradingView Advanced Chart widget for visual charts.
The TradingView widget supplies its own chart candles and chart interaction.
**We do not scrape TradingView, read its iframe data, or copy its candles into our DB.**
TradingView's attribution remains visible. Review TradingView widget/brand terms before commercial release.

Hidden Alpha's own **read-only Bybit** ticker endpoint powers selected Crypto price.
V2 has a **stateless on-demand Alpha endpoint**, `GET /api/v2/analysis`, which pulls the most recent completed candles directly from Bybit. It reuses the existing pure EMA/RSI/ATR, volume, market structure and Alpha Score calculations in memory, with NO Supabase candle read/write. It is independent of the TradingView chart. The old database-backed `GET /api/trading/context` remains available only for legacy workflows until migration.

Forex / XAUUSD: TradingView OANDA chart is independent of the on-demand Forex Alpha Engine. The new read-only OANDA v20 adapter supports XAUUSD, EURUSD and GBPUSD with server-side credentials. The UI displays an unavailable state until those are configured. There is still **no broker execution or live Forex bid/ask quote sync**. An Alpha Engine market bias is NOT an executable trade signal.

## Current V2 components
- `app/v2/page.tsx` — isolated V2 page. Existing `/` still serves the legacy dashboard.
- `components/v2/trading-terminal.tsx` — redesigned V2 workspace with user-triggered analysis.
- `components/v2/tradingview-chart.tsx` — official TradingView widget and visible attribution.
- `components/v2/live-market-quote.tsx` — read-only Bybit REST initial quote + one WebSocket stream for the selected Crypto, falling back to a single REST poll every 30 seconds if the socket fails.
- `components/v2/instruments.ts` — **static symbol metadata only**; no demo prices, P&L, or bias.
- `components/v2/brand.tsx` — interim vector mark; replace only when the exact approved logo file is available.
- `lib/trading/v2/stateless-analysis.ts` — shared pure analysis module for Crypto and Forex, using existing EMA/RSI/ATR/structure/score functions.
- `lib/market-data/oanda-candles.ts` — read-only authenticated OANDA v20 candles, hardcoded to three Forex instruments and supported timeframes.
- `app/api/v2/forex/analysis/route.ts` — on-demand Forex analysis, with brief per-instance cache and duplicate-request deduplication. Returns 503 until a provider is configured.
- `app/api/v2/analysis/route.ts` — public-market-data, read-only Bybit calculations without DB. Only three Crypto symbols and seven timeframes are accepted; no order execution. It rejects missing/stale/gapped closed candles, limits upstream fetch to 8 seconds, coalesces concurrent requests and caches results briefly per server instance (10–30 seconds).
- `scripts/v2-smoke.mjs` — dependency-free local route validation, with optional read-only live Bybit analysis checks.

Removed as unused V2-only code:
- `components/v2/candlestick-chart.tsx` (custom candle chart).
- `app/api/v2/market/candles/route.ts` (redundant read-only V2 candle proxy).
- `components/v2/live-crypto-context.tsx` (duplicated separate context panel).
- `components/v2/mini-stat.tsx` (demo-era market metrics).

## User-visible behavior
1. V2 chart opens without waiting for any database candle sync, scanner, engine health, or journal calls.
2. The selected Crypto quote comes from `GET /api/market/ticker?symbol=...`.
3. `Analyze with Alpha Engine` calls `GET /api/v2/analysis?symbol=...&timeframe=...`
   once per click; no forced startup polling. This endpoint uses completed provider candles and
   computes the engine context in memory. It validates candle count and freshness, and returns an
   error instead of a guessed signal if Bybit is unavailable or stale. Its failure is isolated
   from the TradingView chart.
4. Forex chart works through TradingView; the **separate OANDA Forex Alpha Engine** works only after its server-side token/account configuration is present. The chart remains usable if OANDA is missing. **No executable Forex quote** is shown.
   OANDA `volume` is **number of price updates**, not globally traded volume. The relative activity component in the inherited Alpha Score must be interpreted with that limitation.
5. Chart provider data, Alpha Engine computed context, and portfolio/journal sync are **three
   different sources**. Never mix them or imply the TradingView chart predicts signals.
6. Alpha context older than three selected candle periods (minimum 15 minutes) shows
   `NO TRADE` rather than claiming actionable context.
7. Portfolio and journal show `Not connected` rather than made-up values.

## Background sync / legacy migration
`components/hiddenalpha-shell.tsx` mounts `components/market-auto-sync.tsx`
on **legacy** routes. That old component still triggers up to 12 candle sync jobs
(3 symbols × 4 timeframes) on startup and periodically. It is **NOT mounted** at
`/v2`. Do not delete the shared ingest/market APIs while existing legacy pages
and server-side signal jobs still depend on them.

Future work: migrate the old market/scanner pages to lightweight adapters; only
then remove browser startup sync and redundant historical candle storage. Keep
history if it is needed for auditable backtests/signals, but it must not block UI rendering.

## V2 performance and correctness tests
- A TradingView chart should load without issuing any request to the candle database or Alpha Engine.
- Only the active Crypto symbol opens one ticker WebSocket. When unavailable, REST fallback remains read-only; no candle sync.
- A user pressing Analyze twice within a short period should receive an initial `cache: MISS` and a later `cache: HIT` where the same runtime instance survives.
- `cache: COALESCED` can appear when concurrent requests are deduplicated.
- Reject unsupported symbols/timeframes with HTTP 400. Reject stale/gapped/incomplete candle history with HTTP 503. Upstream errors return 502.
- A closed-candle Alpha context must automatically become NO TRADE when its freshness window expires.
- In-memory caching is per serverless instance, not distributed rate limiting. Add distributed API quotas/security policy before public production usage.
- Verify with two CMD sessions: run `npm run dev` in one; in the other run
  `node scripts/v2-smoke.mjs` then `node scripts/v2-smoke.mjs --live`.
- After setting OANDA credentials, run `node scripts/v2-smoke.mjs --forex`. This makes a read-only OANDA request.
- The `--live` smoke check requires actual Bybit connectivity and can fail during provider outages.

## Optional Forex provider setup (local development)

Use a supported OANDA v20 practice account. Never send its token in chat or commit it.
Add the following **variable names** with your own values to local `.env.local`:

```dotenv
OANDA_API_TOKEN=your-personal-practice-token
OANDA_ACCOUNT_ID=your-practice-account-id
OANDA_ENV=practice
```

Only the server reads these values; never prefix them with `NEXT_PUBLIC_`.
Restart the local Next.js server after editing `.env.local`.
Forex analysis without these settings intentionally returns **HTTP 503**.
Use `node scripts/v2-smoke.mjs --forex` to verify validation or live availability.

Supported analysis timeframes: **1m, 3m, 5m, 15m, 1h, 4h, 1d**.
OANDA's current public granularity table does not show native M3; for 3m
the adapter aggregates **three consecutive completed M1 candles**.
Incomplete 3m groups are discarded rather than inferred.
The OANDA market closes over weekends, so the engine can return NO TRADE
when candles are stale. Forex price-update count is not spot FX trade volume.
The TradingView chart and OANDA analysis may have different intrabar values/feeds.

OANDA v20 docs:
- https://developer.oanda.com/rest-live-v20/pricing-ep/
- https://developer.oanda.com/rest-live-v20/instrument-df/

## V2 Risk Manager — independent of OANDA (Phase 4)
- URL: \`/v2/risk\` (linked from V2 terminal sidebar).
- \`lib/trading/v2/position-sizing.ts\` contains pure client-side risk sizing; it does NOT send orders or persist positions, transactions, or personal financial inputs.
- \`components/v2/risk-calculator.tsx\` provides manual USD-equivalent account equity, long/short, entry/stop/optional target, percent risk, and fee/slippage estimates in bps.
- Supported symbols: BTCUSDT, ETHUSDT, SOLUSDT, XAUUSD, EURUSD, GBPUSD. These are all USD/USDT-quoted linear instruments for **illustrative estimation**; inverse contracts or non-USD account currencies require a separate conversion model.
- Crypto position sizes use a user-provided *quantity increment*. Forex sizes require the user's actual broker-specific contract units per lot and lot increment. **No assumed gold contract size**. Always round **down**, never exceed planned risk budget from rounding.
- Maximum modeled per-trade risk is 5% of account equity. Fees and adverse slippage are included in modeled stop-loss risk and net take-profit. This does **not** guarantee fill price or account liquidation protection.
- No broker/margin integration yet. Users must check contract specification, margin, spreads, swap/funding, liquidation rules and min/max orders before trading.
- Regression tests: Node 24+ can run \`node --test scripts/v2-risk.test.mjs\` using built-in TypeScript type stripping. Test LONG/SHORT sizing, broker lot rounding, missing contract size and bad input protection.
- The general smoke suite now also confirms \`GET /v2/risk\` returns HTTP 200.

## Phase 5 — Trading Journal (local beta)

- Route: \`/v2/journal\` with a real link in the V2 sidebar and dashboard card.
- Files: \`components/v2/trading-journal.tsx\`, \`lib/trading/v2/journal.ts\`, \`app/v2/journal/page.tsx\`.
- Inputs: fully **closed** linear BTCUSDT/ETHUSDT/SOLUSDT/XAUUSD/EURUSD/GBPUSD trades,
  with direction, quantity, entry, exit, total fee, open/close timestamps, optional initial risk and notes.
- Quantity is **base-asset units** for crypto, **base currency units** for EURUSD/GBPUSD, and **troy ounces** for XAUUSD. No broker-specific lot conversion is performed in the journal.
- Fee-adjusted net P&L: (exit − entry) × quantity × (+1 for LONG, −1 for SHORT) − recorded fees.
  Crypto values are USDT and represented as USD-equivalent **without currency conversion**.
- Analytics: closed trade count, win rate, gross profit/loss, profit factor, cumulative
  realized P&L curve, maximum drawdown in quote currency on the **realized P&L curve**,
  fees, and average R only when initial risk is present. No fictional data is preloaded.
- Browser \`localStorage\` only. **Not encrypted, not synced, not tied to an authenticated
  account, not backed up.** Avoid shared devices; export CSV backups. No Supabase writes.
- Import/export uses strict Hidden Alpha CSV header
  \`id,symbol,direction,quantity,entry,exit,feesUsd,openedAt,closedAt,riskUsd,notes\`.
  Import rejects invalid rows atomically and skips existing IDs rather than replacing
  them. Export escapes CSV quotes and guards spreadsheet formula-starting cells.
- Current beta model excludes partial fills, multiple-entry legs, deposits, withdrawals,
  liquidations, swap/funding, conversions and open position unrealized P&L.
  These must be modeled before claiming true broker performance.
- Check: \`node --test scripts/v2-journal.test.mjs\` (8 cases) and
  \`node scripts/v2-smoke.mjs\` (now covers the journal route).
- Before public Production: user-scoped authenticated persistence with RLS,
  proper trade ledger reconciliation and secure broker/CSV import adaptors.
  Do NOT copy localStorage entries into Supabase without explicit opt-in and
  ownership validation.

## Phase 6 — Portfolio Analytics (manual long-only beta)

- Route: \`/v2/portfolio\`, linked from the V2 terminal sidebar and the Portfolio card.
- Files: \`lib/trading/v2/portfolio.ts\`, \`components/v2/portfolio-analytics.tsx\`,
  \`app/v2/portfolio/page.tsx\`, \`scripts/v2-portfolio.test.mjs\`.
- Separate from Trading Journal. **Closed trades do not create or settle open holdings**,
  and realized P&L is NOT added to marked portfolio value. The user tracks positions
  and cash manually, avoiding invented balances or double-counted performance.
- Supports LONG, spot-like BTC/ETH/SOL quantities, EUR/GBP currency units and XAU
  troy ounces; explicitly does NOT calculate derivatives/futures, short positions,
  broker margin, swaps or inverse contract exposure.
- Portfolio figures: marked holdings value, manual cash, total tracked marked value,
  cost basis, unrealized P&L and return on cost, individual allocation and combined
  instrument allocation; trading journal realized totals display separately.
- Every holding requires quantity, average USD unit cost and **user-entered USD
  mark per unit** with a saved timestamp. These are NOT broker quotes or TradingView
  feed values. USDT is displayed as USD-equivalent without FX conversion.
- Local-only browser \`localStorage\` with distinct key
  \`hiddenalpha:v2:portfolio:manual-v1\`; browser scripts can access it, it
  is not encrypted, and clearing site data removes it. No Supabase writes.
- JSON backup/restore includes cash and all holdings. Restore requires confirmation
  before replacing the saved local portfolio. CSV import/export covers holdings only,
  does not include cash, validates all input before writing, skips existing IDs.
- Validated pure calculator prevents negative cash, nonfinite numbers, duplicate IDs,
  unsupported instruments, future mark dates and overly large balances. No fabricated
  position/price data is inserted.
- Unit tests: \`node --test scripts/v2-portfolio.test.mjs\` (9 tests)
  and browser route smoke \`node scripts/v2-smoke.mjs\`.
- Full account net worth / equity return / portfolio drawdown **cannot be inferred**
  without a reconciled transaction ledger including deposits, withdrawals,
  funding, borrowings, fees and broker account balances.
- Do not promote local storage to a cloud record without authenticated user isolation,
  row-level security, encryption and an explicit migration/backup plan.

## Phase 7 — Reference-inspired terminal refinement

The visual north star is a compact navy/cyan trading terminal with a market strip,
left TradingView chart, right AI Decision Brief, six analytics tiles, and below them
Portfolio/Journal/Watchlist panels. **Visual fidelity never authorizes synthetic
pricing, win rates, forecasts, fake key levels or AI claims.**

- The dashboard now uses the screenshot's compact chart-to-brief layout, a highlighted
  cyan AI Decision Brief with a validated directional score/confidence ring, six
  insight panels, and an instrument picker header.
- Header BTC/ETH 24-hour percentages are **real Bybit ticker snapshots** (not chart
  feed values); at most 2 read-only REST refreshes every 2 minutes while the tab is
  visible. Expire stale snapshots instead of retaining live-looking values.
  Gold/EURUSD header badges are labeled "Chart only" until a verified broker quote
  source exists. The selected Crypto symbol's main quote uses its existing separate
  WebSocket with REST fallback.
- Market Regime, Context Score, volume-relative activity, and ATR percentage read
  the actual on-demand server-computed Alpha context. Forex volume is still an
  OANDA price-update count, not traded volume.
- The 1H/4H/1D MTF panel fetches three independent analyses ONLY when the user clicks
  "Check", never in a background loop. Invalid, stale or unavailable timeframes are
  marked "—", not guessed. OANDA remains optional and is not configured by this change.
- R1/R2/S1/S2 are calculated from confirmed **closed-candle swing pivots**, with
  two completed candles on each side for confirmation. If there are no validated
  pivots above/below the latest close, missing levels remain blank. These are
  contextual price references, **not guaranteed support/resistance or trade signals**.
- Stale Alpha scores and price-context tiles are hidden rather than left visible as
  actionable market recommendations; model confidence is an internal score and is
  NOT a predicted percentage chance of winning.
- No DB migrations, no broker order endpoints, no changes to authenticated accounts.
  The previously shipped local-only Journal/Portfolio summaries remain local-only.
- CI includes \`scripts/v2-levels.test.mjs\`, and optional live smoke tests confirm
  the expected regime/level response without Supabase writes.

## Security / release gates
- Do not merge PR #2 until security PR #1 and backend authorization issues are resolved.
- Do not expose any service-role or broker secret in public client components.
- Preserve Supabase tables, customer accounts, orders and journal history.
- Do not deploy production or delete backend candle pipelines until equivalent
  signal/backtest behavior is proven with tests.
- Run `npx tsc --noEmit`, `npm run build`, and `npm run lint`, plus browser acceptance tests.
- Existing ESLint errors in legacy modules still need cleanup or safe removal *after* migration.
- A prior Vercel Preview build could compile and TypeScript-check but failed prerendering
  `/auth` because the Preview Supabase URL/key were not supplied. Local build with
  the user's `.env.local` succeeded; do not use that as proof of Production readiness.
- Verify official uploaded logo asset before replacing the interim vector.

## Windows CMD: pull and test
```bat
cd /d C:\Users\USER\Desktop\hiddenalpha
git status -sb
git fetch origin
git pull --ff-only origin feat/hiddenalpha-v2-visual-terminal
npx tsc --noEmit
npm run build
npm run dev
```
Open `http://localhost:3000/v2`. If the development server is already running,
stop it with Ctrl+C before running `npm run build`, then restart `npm run dev`.
Do not discard the pre-existing local `.gitignore` modification.

### Acceptance checks
- Crypto BTCUSDT, ETHUSDT, SOLUSDT: TradingView chart displays without a 12-job sync.
- Forex XAUUSD, EURUSD, GBPUSD: TradingView charts display, but engine is disabled.
- Change 1m → 15m → 1h; chart updates and engine uses the matching timeframe.
- Click Analyze: see genuine context or a clear error, not a fabricated bullish score.
- In browser network panel, `/v2` does not call `POST /api/market/sync`.
- Simulate a Supabase outage; chart remains available.
- Check that `GET /api/v2/analysis` does not make any Supabase requests and never writes candle rows.
- Before production add API rate limiting/caching, protect expensive compute against abuse, and run signal/indicator regression tests comparing old vs stateless calculations on the same closed candle window.
- Check desktop/mobile layout, TradingView footer attribution, symbol mapping, provider
  access/data delays and any browser CSP/ad-blocking effects.
