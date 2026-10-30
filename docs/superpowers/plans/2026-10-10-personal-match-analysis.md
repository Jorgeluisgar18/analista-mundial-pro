# Personal Match Analysis Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement one task at a time. Keep changes small and do not use real providers in automated tests.

**Goal:** Make the existing football match analysis useful and trustworthy for the owner and a few friends, without adding enterprise features.

**Architecture:** Keep the current app, providers, and analysis model. First remove misleading or expired homepage examples, then do a small manual QA pass with real upcoming matches, and fix only issues that QA demonstrates. This plan supersedes the tracked `docs/superpowers/plans/2026-07-28-production-readiness.md` for the current personal-use goal. The separate expanded local draft that previously occupied that path is preserved byte-for-byte as `docs/superpowers/plans/2026-07-28-production-readiness-expanded-draft.md` to avoid overwriting the newer upstream file.

**Tech Stack:** Existing Next.js/TypeScript app, Vitest, and Playwright; existing configured football-data providers.

---

**Scope:** Match search, analysis report, source/partial-data clarity, and regression of the search-to-report journey. No claim of production readiness is implied.

## Guardrails

- Intended audience: the owner and a few trusted friends.
- Do not add admin dashboards, per-user quotas, multi-tenancy, providers/scraping, or model complexity.
- Never invent odds, lineups, injuries, or other match data; show unavailable/partial data honestly.
- Real-provider QA is manual only. The owner authorizes at most 20 API-Football HTTP requests for the whole QA pass, counting retries. Stop earlier if usage cannot be verified; do not touch Neon or production.
- The owner authorized at most 20 API-Football attempts across the complete PMA-02 QA, counting retries. Before each separately authorized local process, set its process-local cap no higher than the remaining conservative headroom; do not restart or change that cap during a process, or treat it as a distributed production limit/provider billing total. The second QA process used cap 14 because prior attempts were conservatively bounded at `<=6`.
- Keep `tests/e2e/core-flow.spec.ts` on mocked data; automated tests must not call real providers.
- Source implementation and real-provider verification are separate outcomes. Do not describe local/test success as production certification.

## Tasks

### PMA-01 — Remove stale or misleading homepage examples

**Files:**
- `src/components/home/DateMatchFinder.tsx`
- `src/app/page.tsx`
- `tests/unit/date-match-finder.test.tsx`

- [x] Remove expired World Cup/Champions shortcuts because no current, supportable preset dates were needed.
- [x] Replace fixed homepage sample percentages and figures with descriptive, non-match-specific labels and mark the visual as decorative.
- [x] Add focused unit coverage and inspect the homepage in the local browser.

**Acceptance:** No shortcut points to a past example date; static sample metrics are unmistakably illustrative or absent.

**Verification:** Focused Vitest passed (6/6); ESLint, `npx tsc --noEmit`, and `git diff --check` passed. Local browser inspection showed descriptive hero labels without match-specific metrics. Real providers, E2E, production build, and deployment were not run because this work unit does not need them.

### PMA-02 — Run a small real-match QA pass

**Files:**
- `docs/qa/manual-search-matrix.md`

**Authorized local-budget preparation:** `src/lib/providers/qaRequestBudget.ts`, `src/lib/providers/providerRegistry.ts`, `tests/unit/api-football-qa-budget.test.ts`, and `docs/qa/real-api-qa-runbook.md`. This opt-in wrapper counts API-Football fetch attempts before dispatch, including retries and network failures, shares reservations between registry instances in the same process, and rejects further dispatch after the configured limit (maximum 20). Default provider behavior and daily-quota reporting remain separate. Automatic redirects are disabled only for this QA wrapper.

**Preparation and QA evidence (2026-10-26):** The initial simulated test run reproduced 21 dispatched requests and missing attempt logs. The budget/registry/HTTP/API-Football suite passed 17 tests; independent verification passed 10 isolated probes, including default-behavior comparisons against the base revision. The final suite passed 257 tests with 9 skipped; TypeScript and focused ESLint passed. A controlled local production-mode QA then returned 8 Premier League fixtures for `2026-10-31` from Footballdata.io and a clearly explained empty result for `2026-10-26`. The match cabin could not be inspected: the intentional production policy rejects analysis when the database is unconfigured. API-Football recorded 4 attempts under an 18-attempt process cap; an earlier process may have made up to 2, so the conservative total is `<=6/20`, not an exact count. Neon remained disconnected, and the server was stopped. Native review of the prepared code candidate was approved with no findings; no commit, push, or deploy occurred.

**Development-mode follow-up (2026-10-26):** A separate `next dev` process with DB disabled and process cap 14 successfully resolved the selected match cabin (HTTP 200, zero browser console errors; expected Prisma persistence warning). The report exposed a blank competition (`Competicion`), causing The Odds API to reject the competition before `/events`; no odds request was made. XI status was honestly expected, 4-2-3-1, with no player names. Injury/suspension copy says no reports although this provider supplies no availability data, and methodology copy lists odds/history despite those inputs being unavailable here. No API-Football attempt was logged by this process; cumulative usage remains bounded at `<=6/20`, not exact. Server stopped; Neon stayed disconnected.

- [x] Select upcoming matches actually available from configured providers and test a no-match date.
- [x] Complete a single local UI click-through from search to the selected match/report. The connected search-to-report flow and report sections were inspected on 2026-10-26; see the matrix for observed states and findings.
- [x] Record match-detail states and the exact API-Football HTTP-attempt count for the current process, including retries: 1 attempt for the search and none for the detail route.
- [x] Close historical exact-count reconciliation as unrecoverable and out of scope. Preserve the conservative cumulative bound of `<=7/20`; do not make more provider calls solely to reconstruct discarded history. This records a scope decision, not verification of the exact total.

**Acceptance:** The matrix records observed states, distinguishes missing data from provider failure where evidence permits, and documents the exact per-process attempt count plus conservative cumulative bound. An unrecoverable historical exact total is explicitly dispositioned without further calls.

**Owner disposition (2026-10-28):** The exact historical total cannot be recovered from retained evidence and is not worth delaying the personal-use project. Further reconstruction is waived; the known per-process attempt and conservative `<=7/20` bound remain, without claiming an exact cumulative count.

**PMA-02 browser click-through (2026-10-26):** In one local `next dev` process, the browser searched `2026-10-31` / Premier League, received 8 Footballdata.io fixtures, opened Chelsea FC–Manchester United FC (`footballdata-io--740745803`), and inspected the report. The route returned HTTP 200; browser console had 0 errors and 1 expected Prisma warning because local persistence was disabled. The competition and COT kickoff were visible. Both formations were labeled expected (4-2-3-1); no player names were invented. Injury coverage was explicitly unavailable because Footballdata.io does not provide availability in this flow. Markets showed no available odds or market reference. Sources showed the provider's unavailable stats/probabilities and odds-source status. A static “Datos de forma, producción y mercado alineados…” signal still appeared despite absent odds; this is a confirmed copy inconsistency. The page also showed 70% coverage and confidence 6/10 while the provider stats/probabilities and persistent historical calibration were unavailable; the source was not identified during this browser pass, so see the follow-up trace below. API-Football logged exactly 1 attempt in this process (the search); the match-detail route added none. Cumulative usage remains `<=7/20`, not exact. Server stopped; Neon stayed disconnected; no commit, push, or deploy.

**Coverage/confidence source trace and correction (2026-10-26):** The read-only trace confirmed that Footballdata.io marks missing stats unavailable while normalizing numeric priors. Historical enrichment can add `historical-engine` as inferred when team IDs or a calibration run exist, even without either team's historical form. The analysis engine's text heuristic matched that source's “histórico” / “Forma histórica” text as base stats, allowing 70% coverage and the unconfirmed-lineup confidence cap of 6/10. Base-stat recognition now requires both historical team forms before accepting `historical-engine`. The regression in `tests/integration/analysis-engine.test.ts` reproduced the old 70% result before the fix and now asserts 35% coverage and confidence <=4 for unavailable provider stats plus calibration-only history. The QA run did not preserve its final `MatchDataset`, so this confirms the faulty code path but not that it was the source present in that exact run. Verification: focused file 20/20; complete Vitest suite 262 passed/9 skipped across 64 passed/3 skipped files; `npx tsc --noEmit`, focused ESLint, and `git diff --check` passed. Test-process API and database environment variables were removed; no provider requests or Neon access occurred. API-Football usage remains bounded at `<=7/20`, not an exact count. No commit, push, or deploy.

### PMA-03 — Correct only QA-proven confusing states

**Files, only if evidence requires a code change:**
- `src/components/analysis/sections/SquadsSection.tsx`
- `src/components/analysis/sections/SourcesSection.tsx`
- `src/components/analysis/SectionContent.tsx`
- `src/lib/providers/apiFootball.ts`
- `src/lib/providers/footballdataIo.ts`
- `src/components/analysis/SourceLedger.tsx`
- `src/components/analysis/EditorialReading.tsx`
- `tests/unit/squads-section.test.tsx`
- `tests/unit/sources-section.test.tsx`
- `tests/unit/api-football.test.ts`
- `tests/unit/footballdata-io.test.ts`
- `tests/unit/source-ledger.test.tsx`
- `tests/unit/editorial-reading.test.tsx`
- `tests/unit/analysis-cabin.test.tsx`

- [x] Change only a user-facing state shown to be inaccurate or confusing during PMA-02.
- [x] Add a focused regression test for each behavior changed; leave correct states and unrelated model/provider behavior untouched.

**Acceptance:** Every changed message reflects the observed data state and source; no value is fabricated. If QA finds no defect, record that result without making a code change.

**PMA-03 verification (2026-10-26):** Footballdata.io nested competition name/id are normalized; empty or failed injury requests are distinguished from confirmed absence; the quality panel reports the actual statistics-source state and whether odds, lineups, and historical calibration were used. No model calculations or real-provider calls changed. Focused unit suite: 15/15 passed; `npx tsc --noEmit` and focused ESLint passed. No commit, push, or deploy.

**PMA-03 QA recheck (2026-10-26, historical observation):** The browser pass confirmed an unconditional market-reinforcement sentence despite unavailable odds. It also exposed a 70% coverage / 6-of-10 confidence versus unavailable-source discrepancy that was unresolved at that point. The misleading sentence was corrected with a focused regression. The subsequent source trace and coverage/confidence correction are recorded under PMA-02 above; this earlier observation is not a second, still-open application defect.

**Owner scope decision (2026-10-26):** The user replied “acotemos”: change only the misleading market copy and add a regression test. That copy-only task did not change calculations. The separately recorded PMA-02 follow-up later corrected the faulty historical-source classification, while leaving attribution of the original discarded dataset unconfirmed.

- [x] Replace the unconditional market-reinforcement copy with a truthful state and add a focused regression test; do not alter model calculations in this task.

**Synchronization and regression review (2026-10-30):** Competition identity and source availability were recorded in commits `2940326` and `d3d3318`; focused tests passed 7/7 in an isolated index snapshot and 17/17 across the provider and presentation tests, respectively. A subsequent independent review found that a partially official lineup could be promoted to confirmed after match completion. The transition was reproduced, corrected and rechecked: 7/7 focused tests passed; commit `86bf346` records the lineup unit. These commits were pushed to the feature branch, not merged into `master`. No real providers or Neon were contacted for these checks.

### PMA-04 — Preserve the core-flow regression

**Files:**
- `tests/e2e/core-flow.spec.ts`
- `playwright.config.ts`
- `tests/unit/playwright-config.test.ts`
- `src/lib/db/prisma.ts`
- `tests/unit/prisma-runtime.test.ts`

- [x] Keep coverage for searching, selecting a match, and understanding the resulting report.
- [x] Run `npm test -- tests/unit/date-match-finder.test.tsx tests/unit/squads-section.test.tsx tests/unit/source-ledger.test.tsx tests/unit/analysis-cabin.test.tsx` for applicable unit tests.
- [x] Run `npm run test:e2e -- tests/e2e/core-flow.spec.ts` using mocked fixtures; verify the flow remains stable.
- [x] Disable web-server reuse when `CI` is set, while retaining local reuse outside CI. The configuration regression failed before the fix and passed afterward (2/2); independent E2E verification of this follow-up is recorded separately from the earlier run.
- [x] Exercise the previously skipped persistence checks on a fresh, disposable loopback PostgreSQL database; record actual migration, seed, integration, and browser results without accessing Neon or production. The database-enabled suite and final browser run have no skips; see the accumulated closeout evidence below.

**Acceptance:** Relevant unit checks and the core-flow E2E pass locally; record skipped/unavailable checks honestly. No deployment is part of this plan.

**Verification (2026-10-25):** The four unit files passed (28 tests). Core-flow E2E passed (6 tests; 1 Postgres-dependent test intentionally skipped), with provider/database environment variables empty and no existing server reused. The E2E now fulfills flag-CDN and Next image-optimizer requests locally to avoid external image downloads. Focused HTTP/API-Football/persistent-limiter checks also passed (8 tests). These mocked checks do not complete PMA-02, verify a real Neon session, or certify production.

**CI-isolation follow-up (2026-10-26):** A configuration regression first reproduced `reuseExistingServer: true` with `CI=1`. The one-line fix makes reuse conditional on the absence of `CI`; the two configuration tests now pass in Node without loading real environment files. Independent baseline/candidate probes confirmed identical exported local-mode configuration and the intended CI-only difference. Fresh verification passed: 264 Vitest tests (9 skipped), TypeScript, ESLint, and 6 core-flow E2E tests (1 Postgres-dependent test skipped). The E2E started its own server with credentials blanked, used mocked data, and stopped the server afterward. No production or database validation is claimed.

**Build verification (2026-10-26):** The first sanitized snapshot failed because Turbopack rejects an external `node_modules` junction. A fresh snapshot with a physical copy of the already-installed dependencies passed the actual `npm run build` command with default Turbopack, typechecking, and 10/10 generated pages. No packages were installed or downloaded, no real environment files were copied, and live source hashes remained unchanged. The runtime denied scratch cleanup; retained paths and junction precautions are recorded in handoff section 9. This environmental failure was not treated as an application defect.

**Native assessment of the CI follow-up:** The declared current candidate was classified `medium`, `review_due: false` (`under_budget`). No second review was started and no approval for the new change was fabricated.

**Persistence QA finding (2026-10-27, historical):** A disposable local PostgreSQL 16 accepted all four migrations and the seed. The six focused integration files then reported 22 passing and 7 failing tests, with no skips: the application used CommonJS `require` for the generated TypeScript Prisma client and fell back to disabled persistence after module resolution failed under Vitest. Seed loading through ESM worked. The runtime now follows that same ESM import pattern while keeping client construction lazy and retaining the unconfigured-database fallback. A focused regression reproduced the unavailable-client error before the fix and passed afterward (2/2), including unchanged empty reads without database configuration and no socket opened during initialization. Subsequent database-backed proof is recorded below; the older database-free build and CI review do not cover this fix.

**Persistence fixture reconciliation (2026-10-28):** The next isolated run no longer reproduced the client-loading error and passed 25/29 focused tests. The remaining four failures were traced before correction: usage fixtures queried an expired June period (now use a Date-only controlled clock without freezing network timers); the persistence assertion counted input sources instead of final enriched sources (now checks both count and source IDs from the returned dataset); the demo override is a stateless cloned calculation, so its SQL cleanup and DB-only test gate were inappropriate. Real stored-override cleanup remains intact. These test corrections do not change quota expiry, enrichment, or production persistence semantics. The four cases subsequently passed their scoped recheck before the remaining functional checks.

**Intermediate persistence proof (2026-10-28):** The scoped recheck passed 4/4; the six integration files passed 29/29; the full DB-enabled suite passed 275/275 with no skips. Offline verification passed 267 tests with 8 DB-dependent skips. A subsequent optional-length typing correction affected only the evidence assertion; that case passed again (1/1), Prisma runtime regressions passed (2/2), and TypeScript plus lint passed. The application source did not change between those runs. At this stage the browser attempt failed because its server exited after the local network guard blocked one unidentified non-loopback attempt, causing seven cascading failures. The post-Prisma-change build had not run yet. The subsequent diagnosis and final checks follow; these intermediate failures are not separate, still-open application defects.

**Offline verifier diagnosis (2026-10-28):** The first diagnostic selected no tests because its anchored grep did not match Playwright's full titles. A corrected selection was listed before execution and ran exactly one first-flow case: the guard blocked `registry.npmjs.org` before connecting. Installed Next.js code performs an optional dev-server version lookup at `https://registry.npmjs.org/-/package/next/dist-tags` and handles fetch failure by reporting unknown staleness. The temporary QA helper rejects only that exact fetch without making a request or inventing a response; its original socket-level block remains unchanged for all other external destinations. A focused helper probe passed. Process-only telemetry/update notifications were disabled for the final verification. No repository dependency/configuration or sports-analysis behavior was changed by this verifier adjustment.

**Accumulated local closeout (2026-10-28):** Final desktop core flow passed 7/7 with PostgreSQL enabled, no skips and no unexpected socket blocks; one optional Next version lookup was rejected before connecting. The sanitized build snapshot initially lacked compiled Next assets. A non-destructive resync from the existing installed dependencies repaired the copy without downloads, installations or version changes. The actual `npm run build` then passed with the existing portable Node 22.23.2 and default Turbopack, including TypeScript and 10/10 generated pages. The Prisma runtime regressions were also run under Node 22 and passed 2/2. The parent executed this last bounded build directly after the verifier could not launch it because of its model usage limit. Live source hashes remained unchanged. The earlier 275/275 DB and 267/8 offline results are evidence from before the test-only typing correction; the affected assertion was rechecked after that correction, and application logic did not change. Owned test containers and servers were removed/stopped. The runtime-denied scratch cleanup remains pending in handoff section 9. This closes local persistence verification, not Neon/production validation or the unrecoverable historical API-count item.

**Pre-commit native assessment (2026-10-28):** With the six intended untracked files declared, the candidate was assessed as `medium`, `review_due: false` (`under_budget`). This was not a new RDD review or approval; the earlier acknowledged review remains scoped to its own frozen candidate.

**Post-commit RDD status (2026-10-28):** The committed Prisma unit could not complete its native assessment because STATUS requires a native selection for five remaining eligible untracked files, while this session exposes no `external.select_intended_untracked` capture tool. No selection payload or approval was invented. This process limitation is separate from PMA functional completion and does not authorize publication.

**Earlier native assessment (2026-10-25):** After obtaining the canonical inventory and explicitly excluding unrelated untracked paths, Gentle AI classified the tracked changes as `medium`, with `review_due: false` (`under_budget`). RDD remained enabled; no security-review approval was claimed and the unrelated paths were preserved.

**Final native review of the earlier candidate (2026-10-26):** The owner approved review of the frozen candidate containing 23 paths, including the four explicitly selected untracked project files. The native `review-reliability` capture returned no findings. The target-bound STATUS confirmed approval, and the exact acknowledgement returned `acknowledged` with authority `burned`. This closes that candidate's RDD transaction; it does not certify security, rerun functional checks, or authorize commit, push, or deployment. The subsequent CI-isolation follow-up and this documentation update were not part of that frozen candidate.

## Remaining evidence limits

- PMA-02's exact cumulative count from earlier processes remains unavailable. The observed latest process made exactly one API-Football attempt; the complete historical pass remains conservatively bounded at `<=7/20`. The owner explicitly waived further reconstruction: this is an accepted evidence limitation, not proof of an exact total or an open product defect.
- The coverage/confidence regression proves the faulty classification and its correction, not the precise source present in the earlier browser run, whose final dataset was not retained.
- Database-dependent and production checks require separate authorized environments. Local mocked checks and the completed reliability review do not replace them.

## Overall completion criteria

- Homepage examples cannot mislead users about current dates or actual analysis.
- A bounded real-data QA pass is documented with provenance, observed per-process attempt count, and conservative cumulative bound; unrecoverable historical exact-count evidence is explicitly waived.
- Only evidence-backed user-facing corrections are implemented.
- Search → select → understand report remains covered by regression tests.
- Report source implementation and real-provider verification separately; neither alone certifies production.
