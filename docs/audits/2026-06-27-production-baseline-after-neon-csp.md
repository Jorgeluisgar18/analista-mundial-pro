# Production Baseline After Neon and CSP Fixes

## Scope

Verified facts in this audit come from commands run locally on branch `master` and from production API responses checked on 2026-06-26 America/Bogota, with production response timestamps on 2026-06-27 UTC.

This audit is evidence-only. It does not modify runtime code, tests, package files, or existing documentation. It does not commit changes.

Context documents read:

- `docs/audits/2026-06-26-post-remediation/report.md`
- `docs/superpowers/plans/2026-06-26-data-sources-agents-frontend-roadmap.md`
- `docs/superpowers/plans/2026-06-27-master-audit-backlog-ui-agents-plan.md`

Verified production endpoints:

- `/api/health`
- `/api/provider-status`
- `/api/matches?date=2026-06-15`

Production host checked:

- `https://shiny-torte-4f01e2.netlify.app`

Sanitized production commands used:

```powershell
Invoke-RestMethod -Uri "https://shiny-torte-4f01e2.netlify.app/api/health" | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri "https://shiny-torte-4f01e2.netlify.app/api/provider-status" | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri "https://shiny-torte-4f01e2.netlify.app/api/matches?date=2026-06-15" | ConvertTo-Json -Depth 4
```

No secrets, API key values, private connection strings, database proxy URLs, or raw private provider request URLs are included in this report.

## Repository State

Verified facts:

- Current branch: `master`
- `git status --short` exit code: `0`
- `git status --short` output: no output, so the worktree was clean before this audit file was created.
- `git log --oneline -8` exit code: `0`

Exact recent commits recorded:

```text
664497b docs: add master audit and subagent backlog plan
f667c8d fix: allow Next hydration scripts in CSP
1e19dde fix: map provider usage in health endpoint
10f4411 fix: avoid replaying applied Netlify migration
52adfa0 fix: report database health explicitly
84e7c05 fix: name Netlify database migration for detection
59af029 chore: exclude local artifacts from Netlify uploads
1cced64 feat: migrate persistence to Neon Postgres
```

Interpretation:

- The recent history includes the expected Neon/Postgres migration, Netlify migration safety, database health, provider usage, and CSP hydration fixes.
- At review time, the only observed repository change from this task was this audit file.

## Verification Commands

Verified command outcomes:

| Command | Exit code | Outcome | Evidence |
| --- | ---: | --- | --- |
| `npx prisma validate` | 0 | Passed | Loaded `prisma.config.ts`; schema loaded from `prisma\schema.prisma`; schema is valid. |
| `npm run lint` | 0 | Passed | `eslint` completed without reported errors. |
| `npm test` | 0 | Passed | Vitest: 25 files passed, 3 skipped; 70 tests passed, 6 skipped; duration 17.11s. |
| `npm run build` | 0 | Passed | Next.js 16.2.9 production build compiled successfully in 3.3s; TypeScript completed; 10 static pages generated; app routes listed successfully. |

No failing local verification command was observed, so there is no first actionable local error to record.

## Production API Checks

Verified facts from `/api/health`:

- Exit code: `0`
- Response shape: object with `mode`, `checkedAt`, `providers`, `database`, `databaseRecords`, and `databaseError`.
- `mode`: `api-ready`
- `database`: `connected`
- `databaseRecords`: `1`
- `databaseError`: `null`
- Provider entries returned: 4
- API-Football configured: `true`
- Open-Meteo configured: `true`
- Football-Data configured: `false`
- The Odds API configured: `false`
- API-Football usage reported: used `4` of limit `100` for daily period key `2026-06-27`; reset timestamp reported as `2026-06-28T00:00:00.000Z`.

Verified facts from `/api/provider-status`:

- Exit code: `0`
- Response shape: object with `docsPath` and `providers`.
- `docsPath`: `/docs/provider-setup`
- Provider entries returned: 4
- API-Football configured: `true`
- Open-Meteo configured: `true`
- Football-Data configured: `false`
- The Odds API configured: `false`
- Response exposed provider environment variable names, but no secret values.

Verified facts from `/api/matches?date=2026-06-15`:

- Exit code: `0`
- Response shape: object with `mode`, `source`, `fetchedAt`, `warnings`, `providerStatus`, and `matches`.
- `mode`: `demo`
- `source`: `Datos demostrativos locales`
- Match count: `2`
- Warning count: `2`
- Warnings:
  - `API-Football: sin partidos.`
  - `Sin claves activas o cobertura disponible: se muestran datos demostrativos.`
- Provider status count inside response: `4`
- First match object keys: `id`, `date`, `time`, `kickoff`, `status`, `homeTeam`, `awayTeam`, `competition`, `venue`, `city`, `country`, `timezone`, `dataOrigin`, `fetchedAt`.

Interpretation:

- Production API health is reachable and reports the database as connected.
- Provider configuration is visible without exposing provider secret values.
- The checked matches endpoint returns a valid structured response object, but this specific date falls back to demo data because API-Football returned no matches for the request.

## Frontend Smoke

Verified facts:

- No browser-based frontend smoke test was required by Task 1, and no Playwright or manual browser smoke was run in this audit.
- `npm run build` successfully generated the production app and route manifest.

Known UI bugs and UX risks from the master plan and prior audit context, not re-tested visually in this task:

- Match finder can appear ineffective or blank after a user action if loading, empty, stale-result, or provider-warning states are not obvious.
- “Todas las competiciones” can return a large list after API-Football is enabled; current backlog says the UI may render every match row at once instead of capping visible results.
- Match finder needs clearer result grouping, pagination or virtualization, loading skeletons, empty states, and quota-protected messaging.
- Mobile horizontal rails/tabs need stronger scroll affordance.
- Fixed mobile action surfaces and responsible-gaming notices can reduce usable content space on smaller screens if not continuously tested.

Recommendation:

- Add a repeatable production frontend smoke workflow after this baseline, including home page rendering, match search state visibility, desktop screenshot, and mobile-like screenshot.

## Backend/API Findings

Verified facts:

- Local API-related test suite passed as part of `npm test`.
- Production `/api/health` returned HTTP-successful structured JSON.
- Production `/api/provider-status` returned HTTP-successful structured JSON.
- Production `/api/matches?date=2026-06-15` returned HTTP-successful structured JSON.
- The matches response included provider warnings instead of failing hard when the primary provider had no matches for the checked date.

Recommendations:

- Preserve the current behavior of returning explicit warnings and a structured object instead of a blank or unhandled provider failure.
- Add production smoke automation that fails loudly on 5xx responses, missing provider status, unexpected database disconnects, and invalid match response shapes.
- Improve provider observability beyond current status: failures, latency, cache hits, quota trend, snapshot age, and stale-data warnings.

## Database Findings

Verified facts:

- `npx prisma validate` passed locally.
- Production `/api/health` reported `database: "connected"`.
- Production `/api/health` reported `databaseRecords: 1`.
- Production `/api/health` reported `databaseError: null`.
- Recent commit history includes Neon/Postgres migration and database health fixes.

Interpretation:

- The older SQLite production persistence risk recorded in `docs/audits/2026-06-26-post-remediation/report.md` and `docs/superpowers/plans/2026-06-26-data-sources-agents-frontend-roadmap.md` is stale for the current production baseline, because production now reports a connected database after the Neon/Netlify DB work.

Recommendations:

- Keep database health explicit: connected, unavailable, empty, and no-op/demo states should remain distinguishable.
- Do not replay or rename the already-applied Netlify migration baseline.
- Continue using new migration names only for future schema changes.

## Provider Findings

Verified facts:

- API-Football is configured in production provider status.
- API-Football usage is reported through `/api/health` without exposing key values.
- Open-Meteo is configured and does not require a key for the current flow.
- Football-Data is not configured.
- The Odds API is not configured.
- The checked matches request for 2026-06-15 returned demo mode with warnings after API-Football returned no matches.

Interpretation:

- Production is API-ready, but a provider being configured does not guarantee real match data for every date/query.
- Demo fallback remains active and visible in the response when the primary provider has no coverage for the request.

Recommendations:

- Keep API-Football quota protection as a P0 constraint.
- Add TheSportsDB as secondary enrichment only after separate implementation and tests.
- Add source ranking and conflict visibility before presenting multi-provider data as authoritative.
- Add provider latency/failure/cache metrics before relying on production data at higher traffic.

## UI/UX Findings

Verified facts:

- No visual smoke was run for this audit.
- The production build passed, which verifies the app can compile but does not prove runtime visual quality.

Known UI bugs and stale UX risks named in current planning context:

- Match finder large-result handling is incomplete: visible rows should be capped and expanded with a “Mostrar 20 más” style control.
- Search should keep users informed during provider calls and should never look like a blank no-op.
- Results need clearer count/source/mode/warning messaging.
- Mobile horizontal navigation needs visible scroll affordance.
- Dense analysis tables still need better detail surfaces for formula, source, timestamp, and risk explanation.
- Manual odds entry via JSON is powerful but not user-friendly for non-technical analysts.

Recommendations:

- Execute the planned match finder UX task before further provider expansion, because larger real provider result sets will make the current search experience more fragile.
- Add an E2E assertion that a search shows either found matches, demo mode, or API data instead of leaving the page visually unchanged.

## Security and Secrets Findings

Verified facts:

- This audit did not print or record secret values, API key values, private database URLs, or private connection strings.
- Production provider responses exposed configuration booleans and environment variable names, not secret values.
- Local verification commands completed without requiring secret output.
- The matches report in this file summarizes shape/count/source/mode/warnings and does not include the raw match payload.

Known stale security/documentation notes:

- The older CSP note in `docs/audits/2026-06-26-post-remediation/report.md` says production script policy was resolved to production-only `'self'`; the current master plan marks that CSP audit note as stale because practical production hydration required allowing Next hydration scripts until a stronger nonce/SRI strategy exists.
- `docs/deployment/netlify-neon-postgres.md` is known from the master plan to contain stale guidance implying the baseline SQL exists under `netlify/database/migrations/`; replaying the already-applied Netlify migration caused a production deploy failure and must not be repeated.

Recommendations:

- Keep all provider calls server-side.
- Keep provider status responses limited to booleans, labels, purposes, documentation paths, and usage numbers.
- Add automated grep or smoke checks that prevent secret-looking values and private connection strings from appearing in audits or public docs.
- Clean stale deployment and CSP documentation in a separate docs-only task.

## Updated Priority Backlog

Verified facts supporting backlog:

- Production database health currently reports connected.
- Production provider status currently reports API-Football configured.
- The checked production matches endpoint returned demo data for 2026-06-15 with explicit warnings.
- Local Prisma validation, lint, tests, and build all passed.

Recommendations by priority:

### P0 — must not regress

1. Keep Netlify production deploys green.
2. Never commit or print secrets, API key values, private database URLs, or provider request URLs containing credentials.
3. Keep API-Football free quota protected.
4. Keep match search responses structured, with visible warnings instead of blank UI states.
5. Keep database health explicit and distinguish connected, unavailable, empty, and demo/no-op states.

### P1 — next execution items

1. Fix match finder UX for large result sets, loading clarity, visible result counts, and no-blank states.
2. Add production smoke automation for `/`, `/api/health`, `/api/provider-status`, and `/api/matches`.
3. Clean stale Netlify/Neon migration documentation and stale CSP notes.
4. Improve provider observability: failures, latency, cache hit ratio, quota trend, and snapshot age.
5. Prepare auth and workspace isolation before any public or multiuser usage.
6. Build historical backtesting and calibration before making accuracy claims.

### P2 — data expansion

1. Add TheSportsDB as a secondary enrichment provider.
2. Add OpenFootball as offline historical seed and backtesting source.
3. Add source ranking, conflict visibility, and provenance displays.
4. Add structured manual odds entry before broad non-technical use.
5. Add odds provider support only after key approval and quota/security review.

### P3 — premium UI polish

1. Upgrade result grouping, pagination or virtualization, loading skeletons, and empty states.
2. Add data-quality and model-calibration strips.
3. Improve mobile scroll affordances and bottom safe-area behavior.
4. Add market detail drawers with formula, source, timestamp, risk reason, and responsible interpretation.
