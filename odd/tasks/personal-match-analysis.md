# Personal Match Analysis Scope Reset

## Objective
Re-measure Analista Mundial Pro and replace the oversized production-readiness backlog with a lean plan for the owner and a few trusted friends, focused on accurate and understandable football match analysis.

## Problem and why
The existing roadmap includes production/enterprise work that is not justified by the intended audience. The core analysis journey is already implemented; current evidence points to stale example dates, homepage sample values that can be mistaken for live analysis, and insufficient validation with real provider data.

## Scope
- Produce a compact, evidence-based personal-use implementation plan.
- Record the approved scope in `docs/internal/handoff.md` section 8 without overwriting existing local edits.
- Prioritize the actual match-search-to-report journey, data correctness, clear missing-data states, and a small regression check.
- Explicitly defer enterprise account administration, per-user quotas, multi-tenancy, new providers/scraping, and additional model complexity.
- Continue implementation one approved plan task at a time; the current source-code authorization is limited to PMA-01 homepage examples and sample metrics.

## Constraints
- For PMA-02, owner authorizes a maximum of 20 API-Football HTTP requests for the entire QA pass, counting retries; do not inspect secret values or access/change Neon, push, create a PR, or deploy.
- Preserve all pre-existing modified and untracked files. The expanded local draft that occupied `docs/superpowers/plans/2026-07-28-production-readiness.md` was retained byte-for-byte as `docs/superpowers/plans/2026-07-28-production-readiness-expanded-draft.md` because fresh `origin/master` contains a different tracked file at the original path; do not stage the local draft unless the owner asks.
- The secure-auth worktree and its local commits remain untouched; reassess later only if private access for friends requires it.
- Use no real provider calls in automated tests. The current manual PMA-02 budget is a hard ceiling of 20 API-Football HTTP requests including retries; reserve headroom and stop if the actual counter/request count cannot be verified.
- No commit attribution or Co-Authored-By trailers.

## Authorized scope
The approved plan, PMA-01 homepage behavior/tests, and PMA-02 manual provider QA under a hard ceiling of 20 API-Football HTTP requests including retries. Local work-unit commits are allowed under the repository workflow; remote operations are not authorized.

## Acceptance criteria
- The revised plan has no enterprise/multi-user quota work in its active scope.
- It prioritizes: stale homepage shortcuts and sample-value labeling; a small real-match QA pass; only evidence-driven fixes for misleading or incorrect partial-data states; regression for search → match → analysis.
- It distinguishes implementation from real-provider verification and does not claim production readiness.
- Handoff section 8 records the scope decision and current evidence without deleting or rewriting existing entries.
- `git diff --check` passes; the existing untracked old plan and unrelated dirty files remain preserved.

## Workflow and progress
- Route: DOC-01 used a delegated direct documentation writer. PMA-01 uses a delegated direct writer; trigger: the change spans the homepage, match finder, and focused tests.
- TDD: disabled by the owner's explicit workflow preference (“TDD no… trabajamos con otra metodología”); source: prior explicit user instruction. Use ordinary functional checks, not RED/GREEN claims.
- Test runners: `npm test` (Vitest) and, if the homepage flow needs it, `npm run test:e2e -- tests/e2e/core-flow.spec.ts` (Playwright).
- Delivery strategy: `ask-on-risk`; forecast below the advisory 400 authored-line slice.
- Engram mirror topic: `odd/personal-match-analysis/tasks` — pending because the runtime did not provide an authoritative session ID; do not invent one or issue an unattributed memory write.

### Tasks
- [x] **DOC-01:** Create the lean personal-use plan and update handoff section 8; review both diffs and run `git diff --check`.
- [x] **PMA-01:** Remove stale World Cup/Champions example shortcuts and misleading homepage figures; add focused regression coverage and run applicable checks.
- [ ] **PMA-02:** Complete bounded local QA with real providers and verify the exact API-Football request count, including retries, before marking this task complete.
- [ ] **PMA-03 (scope review required):** Review the date/competition mapping and odds-coverage findings below. The previously described PMA-03 scope covers UI messaging only; any change to provider normalization, date assignment, or competition mapping requires a separate scope decision and is not authorized by this QA evidence.

## Verification and next step
- Completed: project CodeGraph mapping, read the task tracker, inspected the existing broad plan and handoff, preserved the pre-existing July 28 row and expanded local plan draft byte-for-byte (renamed to avoid collision with the upstream tracked plan), created the personal-use plan, and appended the October 10 handoff row. `git diff --check` passes.
- Work-unit commit: `7e7f52a docs: scope roadmap for personal match analysis`.
- Pending: Engram mirror (runtime session identity unavailable). Local handoff and QA documentation were committed in `f09065b`.
- PMA-01 completed: removed the expired preset buttons and replaced fixed numeric hero values with descriptive labels; marked the visual as decorative for assistive technology. Focused Vitest (6/6), ESLint, TypeScript (`npx tsc --noEmit`), and `git diff --check` passed. Local browser inspection confirmed the hero displays descriptive copy rather than match metrics. No real providers, E2E, production build, or deployment were used.
- Work-unit commit: `898dd1c fix: remove stale homepage match examples`.
- Owner updated PMA-02 ceiling to 20 API-Football HTTP requests including retries; no database, push, or production access is included.
- PMA-02 manual QA evidence recorded in `docs/qa/manual-search-matrix.md`: PL Oct 17 returned 10 fixtures assigned to that date while the official split is 5/4/1 across Oct 17/18/19; searching Oct 18 returned 0. LaLiga Oct 18 returned 4 of 10 official pairings; UCL Oct 20 returned the official 9 Tuesday matches. A far-future empty search returned 0 with a clear local fallback state.
- Additional report observations: PSG–Barcelona had a blank competition heading; the odds provider rejected generic `Competicion`, and no market quotes were observed. Leeds–Man Utd showed an expected formation without player names; availability panels said no confirmed report, not confirmed absence. The match date was misassigned in the report too.
- QA isolation: database disabled intentionally, health reported `Sin persistencia`, no Neon access, and provider telemetry was not persisted. The four named 2026/27 club-competition searches were skipped by the API-Football free-season guard. The unfiltered empty-date search could have made one list request plus one retry (`<=2`); actual HTTP usage is unverified. **PMA-02 remains incomplete** and all further real-provider calls must stop until the exact count can be safely verified, despite remaining below the authorized ceiling of 20 by this conservative bound.
- PMA-03 is not authorized for provider/date/competition normalizer changes: current scope is UI messaging only. Revisit scope before any implementation based on these findings.
- Local Git sync (2026-10-24): rebased `codex/personal-match-analysis-plan` onto `origin/master` at `a99cfc7` without conflicts and fast-forwarded local `master`. Post-rebase checks: Vitest 244 passed/9 skipped, lint, TypeScript, build, E2E 11 passed/1 skipped; a historical QA-report encoding defect was corrected and the full suite passed afterward. No push, deploy, live-provider calls, or Neon access.
- Next: resolve safe request-count observability, then decide whether to expand PMA-03 scope before implementing a date/provider mapping fix. No production verification, push, or deploy occurred.

## Relevant files
- `src/components/home/DateMatchFinder.tsx` — currently contains the expired July 2026 World Cup and Champions example shortcuts.
- `src/app/page.tsx` — contains fixed homepage percentages/goal figures.
- `tests/unit/date-match-finder.test.tsx` — existing search component tests.
- `tests/e2e/core-flow.spec.ts` — existing search-to-report flow test.
- `docs/internal/handoff.md` — session log; already has an unrelated uncommitted historical row that must be preserved.
- `docs/superpowers/plans/2026-07-28-production-readiness.md` — upstream-tracked historical broad plan.
- `docs/superpowers/plans/2026-07-28-production-readiness-expanded-draft.md` — preserved local expanded draft, intentionally untracked and byte-identical to its pre-sync contents.
