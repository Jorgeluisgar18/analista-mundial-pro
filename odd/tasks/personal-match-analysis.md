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
- For the current PMA-01 work unit, do not call real APIs, inspect secrets, access/change databases, push, create a PR, or deploy.
- Preserve all pre-existing modified and untracked files. The existing `docs/superpowers/plans/2026-07-28-production-readiness.md` is untracked; leave it untouched and create a new dated replacement plan that clearly supersedes it for the current product goal.
- The secure-auth worktree and its local commits remain untouched; reassess later only if private access for friends requires it.
- For a future real-provider QA pass, keep API-Football usage below the owner's previously stated ceiling of 50 calls; prefer a much smaller budget and use no real provider calls in automated tests.
- No commit attribution or Co-Authored-By trailers.

## Authorized scope
The approved plan and PMA-01 homepage behavior/tests. The documentation plan and handoff update are already complete. Local work-unit commits are allowed under the repository workflow; remote operations are not authorized.

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

## Verification and next step
- Completed: project CodeGraph mapping, read the task tracker, inspected the existing broad plan and handoff, preserved the pre-existing July 28 row and broad plan, created the personal-use plan, and appended the October 10 handoff row. `git diff --check` passes.
- Work-unit commit: `7e7f52a docs: scope roadmap for personal match analysis`.
- Pending: Engram mirror (runtime session identity unavailable). `docs/internal/handoff.md` contains both the pre-existing July 28 addition and the new October 10 row; it remains unstaged to avoid absorbing the unrelated pre-existing edit.
- PMA-01 completed: removed the expired preset buttons and replaced fixed numeric hero values with descriptive labels; marked the visual as decorative for assistive technology. Focused Vitest (6/6), ESLint, TypeScript (`npx tsc --noEmit`), and `git diff --check` passed. Local browser inspection confirmed the hero displays descriptive copy rather than match metrics. No real providers, E2E, production build, or deployment were used.
- Work-unit commit: `898dd1c fix: remove stale homepage match examples`.
- Next: proceed to the bounded real-match QA task only when provider/date inputs are selected, respecting the 10-call plan limit.

## Relevant files
- `src/components/home/DateMatchFinder.tsx` — currently contains the expired July 2026 World Cup and Champions example shortcuts.
- `src/app/page.tsx` — contains fixed homepage percentages/goal figures.
- `tests/unit/date-match-finder.test.tsx` — existing search component tests.
- `tests/e2e/core-flow.spec.ts` — existing search-to-report flow test.
- `docs/internal/handoff.md` — session log; already has an unrelated uncommitted historical row that must be preserved.
- `docs/superpowers/plans/2026-07-28-production-readiness.md` — pre-existing untracked broad plan; preserve unchanged.
