# Hidden Alpha V2 — Rebuild Plan

## Goal
Rebuild the Hidden Alpha user experience around the selected dark-navy/electric-cyan dashboard reference, while preserving the existing trading engine, market data, signal lifecycle, Supabase data and security controls.

## Current implementation (branch: feat/hiddenalpha-v2-visual-terminal)
- `app/v2/page.tsx` is the isolated V2 page; current production `/` is unchanged.
- `components/v2/trading-terminal.tsx` holds the V2 interactive workspace.
- `components/v2/instruments.ts` holds **illustrative** instruments, UI-only market metadata and formatting.
- `components/v2/candlestick-chart.tsx` renders **synthetic** candlesticks for layout testing, not prices from a provider.
- `components/v2/brand.tsx` holds an **interim vector mark**; replace it with the exact approved brand asset once the image file is committed.
- `components/v2/mini-stat.tsx` contains a reusable market metric card.
- `components/v2/live-crypto-context.tsx` requests existing `GET /api/trading/context` on demand for **crypto only**. It displays the API payload independently from the demo cards, does not place orders, and does not automatically poll.
- All trade performance, portfolio, prices, ticker changes, market brief and chart graphics in the rest of the V2 prototype remain **synthetic**. A successful API call does not make those cards live.

## Data/UX requirements
1. Never present synthetic chart or P&L as a live feed.
2. Live crypto market context is a read-only calculated bias. A confidence score is not a guaranteed probability of market direction.
3. Format and freshness of any live candle must be validated before live chart integration, including current versus completed candles and symbol/timeframe matching.
4. Forex (XAUUSD and currency pairs) requires a separate vetted market data provider, a pricing and symbol normalization layer, and instrument-specific risk calculations. Do not send forex symbols to the Bybit perpetual endpoint.
5. Support WAIT/NEUTRAL, stale/unavailable, unsupported timeframe, API failure and NO TRADE states without fabricating data.
6. Live P&L and trading journal require authenticated user-scoped data with RLS, fee accounting, deduplication, and read-only import permissions.

## Release gates
- Resolve and verify existing security-hardening PR #1 separately, including cron and trading mutation authorization.
- Migrate old UI pages one-by-one. Delete old components only after their dependencies and parity are verified.
- Verify `npm run lint`, `npx tsc --noEmit`, and `npm run build`, plus affected runtime routes. Existing lint debt remains and must be addressed before release, not hidden by disabling rules.
- Check the exact official Hidden Alpha logo asset; do not treat the interim vector as the official logo.
- Review V2 on desktop and mobile; compare against the approved reference.
- Keep PR #2 draft and do not merge to `main`, alter schema/user data, or deploy production before all gates pass.

## Manual Windows CMD validation
```bat
cd /d C:\Users\USER\Desktop\hiddenalpha
git status -sb
git fetch origin
git pull --ff-only origin feat/hiddenalpha-v2-visual-terminal
npx tsc --noEmit
npm run build
npm run dev
```
Open `http://localhost:3000/v2`. The page and chart are demo-only by default. Choose a Crypto symbol then click **Load Live Crypto Context** to test the read-only engine; the rest of the dashboard is still illustrative.

Do not reset, stash or overwrite existing local changes (especially `.gitignore`) without reviewing them first.
