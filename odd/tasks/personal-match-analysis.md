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

## Constraints
- No source-code changes, API calls, database operations, push, PR, or deployment in this documentation task.
- Preserve all pre-existing modified and untracked files. The existing `docs/superpowers/plans/2026-07-28-production-readiness.md` is untracked; leave it untouched and create a new dated replacement plan that clearly supersedes it for the current product goal.
- The secure-auth worktree and its local commits remain untouched; reassess later only if private access for friends requires it.
- For a future real-provider QA pass, keep API-Football usage below the owner's previously stated ceiling of 50 calls; prefer a much smaller budget and use no real provider calls in automated tests.
- No commit attribution or Co-Authored-By trailers.

## Authorized scope
Documentation-only update of this feature task, a new lightweight plan under `docs/superpowers/plans/`, and a narrowly appended section-8 handoff entry. Local commit is allowed under the repository workflow; remote operations are not authorized.

## Acceptance criteria
- The revised plan has no enterprise/multi-user quota work in its active scope.
- It prioritizes: stale homepage shortcuts and sample-value labeling; a small real-match QA pass; only evidence-driven fixes for misleading or incorrect partial-data states; regression for search → match → analysis.
- It distinguishes implementation from real-provider verification and does not claim production readiness.
- Handoff section 8 records the scope decision and current evidence without deleting or rewriting existing entries.
- `git diff --check` passes; the existing untracked old plan and unrelated dirty files remain preserved.

## Workflow and progress
- Route: delegated direct documentation writer for the new plan and handoff; trigger: two non-trivial documentation files. This task tracker is maintained inline.
- TDD: not applicable (documentation-only); runner: not applicable.
- Delivery strategy: `ask-on-risk`; forecast below the advisory 400 authored-line slice.
- Engram mirror topic: `odd/personal-match-analysis/tasks` — pending because the runtime did not provide an authoritative session ID; do not invent one or issue an unattributed memory write.

### Tasks
- [x] **DOC-01:** Create the lean personal-use plan and update handoff section 8; review both diffs and run `git diff --check`.

## Verification and next step
- Completed: project CodeGraph mapping, read the task tracker, inspected the existing broad plan and handoff, preserved the pre-existing July 28 row and broad plan, created the personal-use plan, and appended the October 10 handoff row. `git diff --check` passes.
- Pending: Engram mirror (runtime session identity unavailable), selective staging/commit, and recording the commit identity here.
- Next step after this plan-only task: implement the approved personal-use backlog one small verified work unit at a time, starting with homepage examples/sample figures; do not expand into admin quotas or enterprise architecture.

## Relevant files
- `src/components/home/DateMatchFinder.tsx` — currently contains the expired July 2026 World Cup and Champions example shortcuts.
- `src/app/page.tsx` — contains fixed homepage percentages/goal figures.
- `tests/unit/date-match-finder.test.tsx` — existing search component tests.
- `tests/e2e/core-flow.spec.ts` — existing search-to-report flow test.
- `docs/internal/handoff.md` — session log; already has an unrelated uncommitted historical row that must be preserved.
- `docs/superpowers/plans/2026-07-28-production-readiness.md` — pre-existing untracked broad plan; preserve unchanged.
