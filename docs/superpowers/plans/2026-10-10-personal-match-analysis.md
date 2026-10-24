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

- [ ] Select a few upcoming matches that are actually available from configured providers; include a no-match date if practical.
- [ ] In the local UI, inspect search → selected match → report, odds availability, lineup status (official/expected/unavailable), partial data, and source/freshness explanations.
- [ ] Record date/time in Colombia, match, observed states, provider evidence, and actual API-Football HTTP request count (including retries) in the matrix. Do not exceed 20 requests total; do not fabricate unavailable observations.

**Acceptance:** The matrix records what was actually observed, distinguishes missing data from provider failure where evidence permits, and shows the API-call budget used.

### PMA-03 — Correct only QA-proven confusing states

**Files, only if evidence requires a code change:**
- `src/components/analysis/sections/SquadsSection.tsx`
- `src/components/analysis/sections/SourcesSection.tsx`
- `src/components/analysis/SourceLedger.tsx`
- `tests/unit/squads-section.test.tsx`
- `tests/unit/source-ledger.test.tsx`
- `tests/unit/analysis-cabin.test.tsx`

- [ ] Change only a user-facing state shown to be inaccurate or confusing during PMA-02.
- [ ] Add a focused regression test for each behavior changed; leave correct states and unrelated model/provider behavior untouched.

**Acceptance:** Every changed message reflects the observed data state and source; no value is fabricated. If QA finds no defect, record that result without making a code change.

### PMA-04 — Preserve the core-flow regression

**Files:**
- `tests/e2e/core-flow.spec.ts`

- [ ] Keep coverage for searching, selecting a match, and understanding the resulting report.
- [ ] Run `npm test -- tests/unit/date-match-finder.test.tsx tests/unit/squads-section.test.tsx tests/unit/source-ledger.test.tsx tests/unit/analysis-cabin.test.tsx` for applicable unit tests.
- [ ] Run `npm run test:e2e -- tests/e2e/core-flow.spec.ts` using mocked fixtures; verify the flow remains stable.

**Acceptance:** Relevant unit checks and the core-flow E2E pass locally; record skipped/unavailable checks honestly. No deployment is part of this plan.

## Overall completion criteria

- Homepage examples cannot mislead users about current dates or actual analysis.
- A bounded real-data QA pass is documented with provenance and call count.
- Only evidence-backed user-facing corrections are implemented.
- Search → select → understand report remains covered by regression tests.
- Report source implementation and real-provider verification separately; neither alone certifies production.
