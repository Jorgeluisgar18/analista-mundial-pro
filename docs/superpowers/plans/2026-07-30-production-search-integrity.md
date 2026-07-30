# Production Search Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return a transparent empty result for successful provider searches with no matches and suppress expected lineups for finished matches.

**Architecture:** `matchService` tracks whether any football provider completed a calendar request before deciding between an empty API response and a production unavailable error. `withExpectedLineups` receives no new dependency: it reads `dataset.match.status` and creates unavailable lineup evidence for finished matches without altering provider-confirmed XIs.

**Tech Stack:** Next.js route handlers, TypeScript, Vitest, existing normalized domain types.

---

### Task 1: Preserve successful empty calendar responses

**Files:**
- Modify: `tests/integration/match-service.test.ts`
- Modify: `src/lib/services/matchService.ts`

- [x] **Step 1: Write failing production tests**

```ts
it("en producción devuelve una lista vacía si un proveedor respondió sin partidos", async () => {
  const service = createMatchService({
    runtimePolicy: createRuntimePolicy({ NODE_ENV: "production" }),
    providers: { football: [emptyProvider] },
  });

  await expect(service.listByDate("2035-01-01")).resolves.toMatchObject({
    mode: "api",
    matches: [],
  });
});

it("en producción conserva 503 si ningún proveedor responde", async () => {
  const service = createMatchService({
    runtimePolicy: createRuntimePolicy({ NODE_ENV: "production" }),
    providers: { football: [failingProvider] },
  });

  await expect(service.listByDate("2035-01-01")).rejects.toMatchObject({ status: 503 });
});
```

- [x] **Step 2: Run the focused test and confirm RED**

Run: `npx vitest run tests/integration/match-service.test.ts`

Expected: the successful-empty production case fails with `ProductionDataUnavailableError`.

- [x] **Step 3: Add the smallest service state needed**

```ts
let hasSuccessfulProviderResponse = false;
// Set it immediately after await provider.listMatches(...).
// After the loop, return { mode: "api", source: "Cobertura de proveedores", ... , matches: [] }
// only when hasSuccessfulProviderResponse is true.
```

- [x] **Step 4: Re-run the focused test and confirm GREEN**

Run: `npx vitest run tests/integration/match-service.test.ts`

Expected: all tests in the file pass.

### Task 2: Do not infer lineups after a finished match

**Files:**
- Modify: `tests/unit/expected-lineups.test.ts`
- Modify: `src/lib/lineups/expectedLineups.ts`

- [x] **Step 1: Write a failing finished-match test**

```ts
it("does not infer an expected XI for a finished match without lineups", () => {
  const dataset = structuredClone(demoDataset);
  dataset.match.status = "finished";
  dataset.lineups = [];
  dataset.players = [];

  const enriched = withExpectedLineups(dataset);

  expect(enriched.lineups.every((lineup) => lineup.status === "unavailable")).toBe(true);
  expect(enriched.sources.some((source) => source.id === "expected-lineups")).toBe(false);
});
```

- [x] **Step 2: Run the focused test and confirm RED**

Run: `npx vitest run tests/unit/expected-lineups.test.ts`

Expected: the new test fails because missing lineups become `expected`.

- [x] **Step 3: Add a finished-match unavailable lineup factory**

```ts
function unavailableLineup(teamId: string): LineupProjection {
  return {
    teamId,
    formation: unavailableFormationEvidence(),
    status: "unavailable",
    confirmed: false,
    starters: [],
  };
}
```

Use this factory when `next.match.status === "finished"` and the provider did not supply a confirmed lineup. Keep an existing confirmed XI unchanged.

- [x] **Step 4: Re-run the focused test and confirm GREEN**

Run: `npx vitest run tests/unit/expected-lineups.test.ts`

Expected: all expected-lineup tests pass.

### Task 3: Verify and document safe operations

**Files:**
- Modify: `docs/qa/qa-real-providers-2026-07-30.md`
- Modify: `docs/internal/handoff.md`

- [x] **Step 1: Run regression checks**

Run: `npx vitest run tests/integration/match-service.test.ts tests/unit/expected-lineups.test.ts && npx tsc --noEmit && npm run lint && git diff --check`

Expected: every command exits 0.

- [x] **Step 2: Configure the existing The Odds API key as a Netlify secret**

Create/update only `ODDS_API_KEY` in the project's production environment. Never place the value in source, test output, a commit or documentation.

- [x] **Step 3: Reactivate continuous builds**

Set the verified Netlify build status from `Stopped` to `Active`. Do not push or manually deploy in this task.

- [x] **Step 4: Record the exact configuration and QA state**

Record whether the environment variable and builds are active, without recording secret values. Keep the follow-up real odds request limited to one `/events` match and one corresponding detail call after a separately authorized deploy.
