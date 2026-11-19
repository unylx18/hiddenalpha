# Hidden Alpha V2 — lightweight trading terminal rebuild

## Architecture decision (2026-11-19)
V2 uses an official, hosted TradingView Advanced Chart widget for visual charts.
The TradingView widget supplies its own chart candles and chart interaction.
**We do not scrape TradingView, read its iframe data, or copy its candles into our DB.**
TradingView's attribution remains visible. Review TradingView widget/brand terms before commercial release.

Hidden Alpha's own **read-only Bybit** ticker endpoint powers selected Crypto price.
V2 has a **stateless on-demand Alpha endpoint**, `GET /api/v2/analysis`, which pulls the most recent completed candles directly from Bybit. It reuses the existing pure EMA/RSI/ATR, volume, market structure and Alpha Score calculations in memory, with NO Supabase candle read/write. It is independent of the TradingView chart. The old database-backed `GET /api/trading/context` remains available only for legacy workflows until migration.

Forex / XAUUSD: the TradingView OANDA chart is supported for chart-only visualization.
There is currently no validated Forex Alpha Engine or brokerage quote sync.
Do not display a derived forex signal until a provider adapter and instrument normalization are complete.

## Current V2 components
- `app/v2/page.tsx` — isolated V2 page. Existing `/` still serves the legacy dashboard.
- `components/v2/trading-terminal.tsx` — redesigned V2 workspace with user-triggered analysis.
- `components/v2/tradingview-chart.tsx` — official TradingView widget and visible attribution.
- `components/v2/live-market-quote.tsx` — read-only Bybit quote for selected Crypto.
- `components/v2/instruments.ts` — **static symbol metadata only**; no demo prices, P&L, or bias.
- `components/v2/brand.tsx` — interim vector mark; replace only when the exact approved logo file is available.
- `app/api/v2/analysis/route.ts` — public-market-data, read-only Bybit context calculations without DB. Only three Crypto symbols and seven timeframes are accepted; no order execution.

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
4. Forex chart works through TradingView; its own Alpha Engine and live quote are deliberately
   marked unsupported until a validated forex provider is implemented.
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
