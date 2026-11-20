# HiddenAlpha security & operations

## Privileged API routes
Market ingestion, signal publishing, lifecycle mutations, and signal status changes require authorization.

- Automation: `Authorization: Bearer <CRON_SECRET>` sent from trusted server-side jobs.
- Interactive administrator: Supabase authenticated session whose user ID is listed in the server-only `HIDDENALPHA_ADMIN_USER_IDS` variable (comma-separated).
- Missing or invalid authorization returns HTTP 401. An ordinary public signup does **not** grant administrator rights.

**Never expose either secret or user allowlist as a `NEXT_PUBLIC_*` variable.** Do not place the CRON secret in frontend code or browser storage.

The browser now only polls the read-only `/api/trading/health`; scheduled ingestion and signal publishing must run server-side.

## Scheduled desk cycle
GitHub Actions `.github/workflows/hiddenalpha-desk.yml` authenticates the production `/api/cron/desk` route with the GitHub repository secret `HIDDENALPHA_CRON_SECRET`.

On Vercel Production, `CRON_SECRET` must exist and **have exactly the same value** as `HIDDENALPHA_CRON_SECRET` on GitHub. Configure both values directly in the respective provider UIs. This repo does not manage or print secrets. Changes to Vercel environment variables require a fresh deployment.

The last known production invocation returned HTTP 401 on 2026-11-15, so live automation must be considered **not verified** until a new workflow run completes successfully and `/api/trading/health` reports `OPERATIONAL`. GitHub may disable scheduled workflows after prolonged repository inactivity; check workflow enablement in the Actions page if no schedule runs appear.

## Validation
```bash
npm ci
npm run test:smoke
npx tsc --noEmit
npm run lint
npm run build
```

**Release gate:** First align cron secrets and verify an authenticated production desk run. Then merge tested code. This change must not be used to claim profitable signals, live trading readiness, or a passing build without CI evidence.
