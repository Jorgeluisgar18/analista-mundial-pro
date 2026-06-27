# Master Audit, Backlog, UI, and Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current production-ready MVP into a robust, free-friendly, premium-feeling football intelligence platform for World Cup 2026 first, then top European leagues, Champions League, and other attractive markets.

**Architecture:** Keep the app server-first: browser UI calls internal Next.js route handlers, route handlers call provider services, provider services normalize/cache/persist through Neon/Postgres, and analysis views consume traceable datasets. Treat API-Football as the primary real-data provider under strict quota control, TheSportsDB as secondary enrichment, OpenFootball as offline/historical seed, and OpenAI Agents SDK as an internal audit/research automation layer after explicit API-key approval.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, Neon/Postgres through Netlify Database fallback, Netlify hosting, Vitest, Playwright, API-Football, Football-Data optional, The Odds API optional, TheSportsDB planned, OpenFootball planned, OpenAI Agents SDK planned.

---

## Current verified state

Last production checkpoint from this workstream:

- Production URL: `https://shiny-torte-4f01e2.netlify.app`.
- Branch: `master`.
- API-Football key is configured in Netlify.
- Netlify Database / Neon is connected through runtime DB fallback.
- `/api/health` reports `database: "connected"` and provider usage.
- `/api/matches?date=YYYY-MM-DD` can return API-Football data.
- CSP hydration bug was fixed by allowing Next hydration scripts in `script-src`.
- The latest deployed commit known in this thread is `f667c8d` with message `fix: allow Next hydration scripts in CSP`.

Important state changes from the older roadmap:

- The old SQLite production persistence risk is largely resolved for runtime because Neon/Netlify DB is now connected.
- The Netlify migration baseline was already applied once. Do not edit or replay the historical Netlify migration name `20260626230000_postgres-baseline`.
- `docs/deployment/netlify-neon-postgres.md` still contains stale guidance that says the baseline SQL exists under `netlify/database/migrations/`; this needs cleanup because replaying an applied Netlify migration caused a production deploy failure.
- The CSP audit note saying production uses only `script-src 'self'` is now stale. Current practical CSP allows `unsafe-inline` for script hydration until a nonce/SRI strategy is implemented.

## Consolidated pending work by priority

### P0 — must not regress

- Production deploys must stay green on Netlify.
- Secrets must never be committed or printed.
- API-Football free limit must be protected.
- Search UI must never look blank after user action.
- Database health must clearly distinguish connected, unavailable, and empty.

### P1 — next serious product layer

- Add a current baseline audit after the CSP/Neon/API fixes.
- Fix match finder UX for large result sets, current date defaults, and filters.
- Add production smoke tests that can be run after each Netlify deploy.
- Clean stale docs around Netlify migrations and Neon setup.
- Improve provider observability: failures, latency, cache hits, quota, snapshot age.
- Prepare auth/workspace isolation before public or multiuser use.
- Build historical backtesting/calibration pipeline before claiming model accuracy.

### P2 — data expansion

- Add TheSportsDB as a secondary free provider.
- Add OpenFootball import as offline historical seed and backtesting source.
- Add richer source ranking/conflict visibility.
- Add structured manual odds entry, not only JSON.
- Add odds provider path for value betting/surebet comparison after key approval.

### P3 — premium UI polish

- Upgrade match finder to feel like a premium command center.
- Add result grouping, pagination/virtualization, loading skeletons, and stronger empty states.
- Improve mobile scroll affordances and bottom-safe-area behavior.
- Add data-quality strip and model calibration strip.
- Add richer market drawers with formula, source, timestamp, and risk reason.

## Delegation strategy

Use isolated subagents by domain. Do not let two agents edit the same file family in the same wave unless a coordinator has merged and re-run tests.

### Wave 1: safe parallel audit and low-risk cleanup

1. **QA Baseline Agent**
   - Owns `docs/audits/**`, production smoke evidence, and test command reporting.
   - Does not modify product code.

2. **Docs Consistency Agent**
   - Owns `docs/deployment/netlify-neon-postgres.md`, `docs/provider-setup.md`, and README deployment notes.
   - Does not modify runtime code.

3. **Frontend Search UX Agent**
   - Owns `src/components/home/DateMatchFinder.tsx`, related CSS in `src/app/globals.css`, and finder tests.
   - Does not modify provider logic.

### Wave 2: backend/data foundations

4. **Provider Reliability Agent**
   - Owns API-Football quota details, provider status mapping, provider warnings, and provider tests.
   - Coordinates with UI agent only through response contracts.

5. **Observability Agent**
   - Owns health/usage APIs, provider telemetry schema, and dashboard health UI.
   - Avoids changing match search UI.

6. **Database Hardening Agent**
   - Owns Prisma migrations, DB docs, and Neon/Netlify deployment verification.
   - Must not edit applied historical Netlify migration names.

### Wave 3: expansion

7. **TheSportsDB Agent**
   - Owns TheSportsDB client, normalizers, provider registry, docs, and tests.

8. **OpenFootball Agent**
   - Owns offline repo sync, import, normalization, source metadata, and backtesting seed docs.

9. **Model Validation Agent**
   - Owns backtesting/calibration tables, Brier/log loss/RPS calculations, and result reports.

### Wave 4: agentic internal tooling

10. **OpenAI Agents SDK Agent**
    - Owns only internal audit/research tooling after `OPENAI_API_KEY` flow is approved.
    - Must read current official OpenAI Agents docs before implementation.
    - Must not influence betting recommendations directly without traceable evidence and human review.

---

## Task 1: Fresh baseline audit after production fixes

**Files:**

- Create: `docs/audits/2026-06-27-production-baseline-after-neon-csp.md`
- Read: `docs/audits/2026-06-26-post-remediation/report.md`
- Read: `docs/superpowers/plans/2026-06-26-data-sources-agents-frontend-roadmap.md`

- [ ] **Step 1: Record repository state**

Run:

```powershell
git status --short
git log --oneline -8
```

Expected:

- Worktree status is explicitly recorded.
- Latest commits include Neon/health/CSP fixes.

- [ ] **Step 2: Run local verification commands**

Run:

```powershell
npx prisma validate
npm run lint
npm test
npm run build
```

Expected:

- Document exact command results.
- If any command fails, stop the audit and record the failing command, exit code, and first actionable error.

- [ ] **Step 3: Run production API checks**

Run:

```powershell
Invoke-RestMethod -Uri "https://shiny-torte-4f01e2.netlify.app/api/health" | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri "https://shiny-torte-4f01e2.netlify.app/api/provider-status" | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri "https://shiny-torte-4f01e2.netlify.app/api/matches?date=2026-06-15" | ConvertTo-Json -Depth 4
```

Expected:

- `/api/health` shows database connected or a clear unavailable error.
- `/api/provider-status` shows API-Football configured without exposing secrets.
- `/api/matches?date=2026-06-15` returns a valid response object.

- [ ] **Step 4: Write audit sections**

Create the report with these exact headings:

```markdown
# Production Baseline After Neon and CSP Fixes

## Scope

## Repository State

## Verification Commands

## Production API Checks

## Frontend Smoke

## Backend/API Findings

## Database Findings

## Provider Findings

## UI/UX Findings

## Security and Secrets Findings

## Updated Priority Backlog
```

- [ ] **Step 5: Commit audit only**

Run:

```powershell
git add docs/audits/2026-06-27-production-baseline-after-neon-csp.md
git commit -m "docs: add production baseline audit"
```

Acceptance criteria:

- Audit separates verified facts from recommendations.
- Audit names all known stale docs and UI bugs.
- Audit does not include secrets, API keys, proxy URLs, or raw private connection strings.

---

## Task 2: Fix match finder UX for large result sets and no-blank states

**Files:**

- Modify: `src/components/home/DateMatchFinder.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/unit/date-match-finder.test.tsx`
- Modify: `tests/e2e/core-flow.spec.ts`

Root cause to address:

- After API-Football was enabled, “Todas las competiciones” can return a very large list.
- The UI currently renders every match row at once.
- Users need obvious loading, error, empty, quota-protected, and truncated-result states.

- [ ] **Step 1: Add failing unit test for capped visible results**

Append this test in `tests/unit/date-match-finder.test.tsx`:

```tsx
it("limita resultados masivos y explica cómo refinar la búsqueda", async () => {
  const manyMatches = Array.from({ length: 80 }, (_, index) => ({
    ...demoMatches[0],
    id: `fixture-${index}`,
    time: `${String(index % 24).padStart(2, "0")}:00`,
    homeTeam: { ...demoMatches[0].homeTeam, name: `Local ${index}` },
    awayTeam: { ...demoMatches[0].awayTeam, name: `Visitante ${index}` },
  }));

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: "api",
        source: "API-Football",
        warnings: [],
        matches: manyMatches,
      }),
    }),
  );

  render(<DateMatchFinder initialDate="2026-06-27" />);
  await userEvent.click(
    screen.getByRole("button", { name: /buscar partidos/i }),
  );

  expect(await screen.findByText(/80 partidos encontrados/i)).toBeVisible();
  expect(screen.getAllByRole("link").filter((link) =>
    link.className.includes("match-row"),
  )).toHaveLength(20);
  expect(screen.getByText(/mostrando 20/i)).toBeVisible();
  expect(screen.getByRole("button", { name: /mostrar 20 más/i })).toBeVisible();
});
```

Run:

```powershell
npx vitest run tests/unit/date-match-finder.test.tsx
```

Expected:

- Test fails because result limiting and “Mostrar 20 más” do not exist yet.

- [ ] **Step 2: Implement local visible-count state**

In `src/components/home/DateMatchFinder.tsx`, add constants near the response interface:

```ts
const INITIAL_VISIBLE_MATCHES = 20;
const VISIBLE_MATCH_INCREMENT = 20;
```

Add state:

```ts
const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MATCHES);
```

Reset it in `searchMatches()` before fetch:

```ts
setVisibleCount(INITIAL_VISIBLE_MATCHES);
```

After `result ? (` begins, derive:

```ts
const visibleMatches = result.matches.slice(0, visibleCount);
const hiddenMatchCount = Math.max(0, result.matches.length - visibleMatches.length);
```

Render `visibleMatches.map` instead of `result.matches.map`.

- [ ] **Step 3: Add result summary and more button**

Replace the result count span with copy that handles large lists:

```tsx
<span>
  {result.matches.length} partidos encontrados
  {hiddenMatchCount > 0 ? ` · mostrando ${visibleMatches.length}` : ""}
</span>
```

After the match list, render:

```tsx
{hiddenMatchCount > 0 ? (
  <button
    className="secondary-button load-more-matches"
    type="button"
    onClick={() =>
      setVisibleCount((current) => current + VISIBLE_MATCH_INCREMENT)
    }
  >
    Mostrar 20 más
  </button>
) : null}
```

- [ ] **Step 4: Add loading and stale-result clarity**

When `loading` is true, keep existing results visible but add:

```tsx
{loading ? (
  <p className="finder-loading" role="status">
    Consultando proveedores sin exponer claves en el navegador…
  </p>
) : null}
```

Style in `src/app/globals.css`:

```css
.finder-loading {
  margin: 1rem 0 0;
  color: var(--muted);
  font-size: 0.92rem;
}

.load-more-matches {
  margin-top: 1rem;
  width: 100%;
  justify-content: center;
}
```

- [ ] **Step 5: Add E2E assertion for the finder**

In `tests/e2e/core-flow.spec.ts`, add:

```ts
test("la búsqueda muestra estado visible en lugar de quedar en blanco", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Fecha").fill("2026-06-15");
  await page.getByRole("button", { name: "Buscar partidos" }).click();
  await expect(
    page.getByText(/partidos encontrados|Modo demostración|Datos de API/),
  ).toBeVisible();
});
```

Run:

```powershell
npx vitest run tests/unit/date-match-finder.test.tsx
npm run test:e2e
```

Expected:

- Unit and E2E checks pass.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/components/home/DateMatchFinder.tsx src/app/globals.css tests/unit/date-match-finder.test.tsx tests/e2e/core-flow.spec.ts
git commit -m "fix: cap match finder results and clarify loading states"
```

Acceptance criteria:

- Large API responses no longer flood the DOM.
- User sees how many results were found and how many are visible.
- Search never appears as a blank no-op.

---

## Task 3: Align competition filtering and provider query behavior

**Files:**

- Modify: `src/lib/providers/competitionCatalog.ts`
- Modify: `src/lib/providers/apiFootball.ts`
- Modify: `tests/unit/competition-providers.test.ts`
- Modify: `tests/integration/api-routes.test.ts`

Problem:

- UI competition values are slugs such as `wc-2026` and `premier-league`.
- API-Football accepts numeric `league` IDs, not these slugs.
- Current code avoids sending slug as `league`, then filters after the broad provider response. This protects correctness but can spend quota on broad date searches.

- [ ] **Step 1: Add optional API-Football league IDs to catalog**

Update `SupportedCompetition`:

```ts
apiFootballLeagueId?: number;
```

Add known mappings that are already safe:

```ts
{
  slug: "wc-2026",
  name: "FIFA World Cup",
  kind: "NATIONAL",
  aliases: ["fifa world cup", "world cup", "mundial"],
  footballDataCode: "WC",
  apiFootballLeagueId: 1,
}
```

Leave uncertain league IDs unset until verified.

- [ ] **Step 2: Add resolver**

Add:

```ts
export function resolveApiFootballLeague(value?: string) {
  const competition = findSupportedCompetition(value);
  if (competition?.apiFootballLeagueId) return competition.apiFootballLeagueId;
  if (value && /^\d+$/.test(value)) return Number(value);
  return undefined;
}
```

- [ ] **Step 3: Use resolver in API-Football provider**

In `src/lib/providers/apiFootball.ts`, replace direct numeric slug check with:

```ts
const league = resolveApiFootballLeague(competition);
if (league) {
  url.searchParams.set("league", String(league));
}
```

Keep `matchesCompetition` post-filter because provider names/rounds can still vary.

- [ ] **Step 4: Test no slug leakage and numeric mapping**

In `tests/unit/competition-providers.test.ts`, assert:

```ts
expect(resolveApiFootballLeague("wc-2026")).toBe(1);
expect(resolveApiFootballLeague("123")).toBe(123);
expect(resolveApiFootballLeague("premier-league")).toBeUndefined();
```

Keep the existing test that ensures slug is not sent as `league`.

- [ ] **Step 5: Run provider tests**

Run:

```powershell
npx vitest run tests/unit/competition-providers.test.ts tests/integration/api-routes.test.ts
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/lib/providers/competitionCatalog.ts src/lib/providers/apiFootball.ts tests/unit/competition-providers.test.ts tests/integration/api-routes.test.ts
git commit -m "fix: resolve safe api-football league filters"
```

Acceptance criteria:

- World Cup filter can call API-Football with known league ID.
- Unknown slug filters never become invalid API-Football `league` params.
- Post-filter remains as a safety net.

---

## Task 4: Clean deployment and database documentation

**Files:**

- Modify: `docs/deployment/netlify-neon-postgres.md`
- Modify: `docs/provider-setup.md`
- Modify: `README.md`
- Modify: `.env.example`

Problem:

- Docs still imply Netlify baseline migration lives under `netlify/database/migrations`.
- That migration was already applied once and must not be replayed or edited.
- The app currently supports `DATABASE_URL` and Netlify Database fallback through `NETLIFY_DB_URL`.

- [ ] **Step 1: Update Netlify migration guidance**

Replace any statement saying the baseline SQL exists in `netlify/database/migrations/` with:

```markdown
Netlify Database already applied the initial baseline during setup. Do not edit or replay that applied migration. Future schema changes must use new migration names only. Prisma remains the canonical local migration history under `prisma/migrations/`.
```

- [ ] **Step 2: Document runtime DB selection**

Add:

```markdown
Runtime DB priority:

1. `DATABASE_URL` when configured and pointing to Postgres.
2. Netlify Database `NETLIFY_DB_URL` through `@netlify/database`.
3. No-op persistence only for local/demo environments without Postgres.
```

- [ ] **Step 3: Document production verification endpoints**

Add:

```markdown
After every deploy, verify:

- `/api/health` reports `database: "connected"`.
- `/api/provider-status` shows expected provider configuration.
- `/api/usage` does not expose secrets.
- `/api/matches?date=YYYY-MM-DD` returns a structured response.
```

- [ ] **Step 4: Run doc grep for stale migration text**

Run:

```powershell
rg -n "netlify/database/migrations|postgres-baseline|SQLite|sqlite|no-op|NETLIFY_DB_URL|DATABASE_URL" docs README.md .env.example
```

Expected:

- Any remaining stale claims are intentionally explained.

- [ ] **Step 5: Commit**

Run:

```powershell
git add docs/deployment/netlify-neon-postgres.md docs/provider-setup.md README.md .env.example
git commit -m "docs: clarify Neon and Netlify Database operations"
```

Acceptance criteria:

- A future agent will not reintroduce the applied Netlify migration conflict.
- Production DB setup is understandable without reading this chat.

---

## Task 5: Add production smoke workflow

**Files:**

- Create: `scripts/smoke-production.ts`
- Modify: `package.json`
- Create: `docs/qa/production-smoke.md`
- Modify: `tests/e2e/core-flow.spec.ts` only if reusable selectors are needed.

- [ ] **Step 1: Add script contract**

Create `scripts/smoke-production.ts`:

```ts
const baseUrl = process.env.SMOKE_BASE_URL ?? "https://shiny-torte-4f01e2.netlify.app";

async function readJson(path: string) {
  const res = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} failed with ${res.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as unknown;
}

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} did not return an object`);
  }
}

async function main() {
  const health = await readJson("/api/health");
  assertObject(health, "health");
  if (health.database !== "connected") {
    throw new Error(`database is not connected: ${JSON.stringify(health)}`);
  }

  const providers = await readJson("/api/provider-status");
  assertObject(providers, "provider-status");

  const matches = await readJson("/api/matches?date=2026-06-15");
  assertObject(matches, "matches");
  if (!Array.isArray(matches.matches)) {
    throw new Error("matches response does not include a matches array");
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    database: health.database,
    matchCount: matches.matches.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Add package script**

In `package.json`:

```json
"smoke:production": "tsx scripts/smoke-production.ts"
```

- [ ] **Step 3: Add docs**

Create `docs/qa/production-smoke.md`:

```markdown
# Production Smoke Checks

Run after every Netlify production deploy:

```powershell
npm run smoke:production
```

For a deploy preview:

```powershell
$env:SMOKE_BASE_URL="https://deploy-preview-url.example"
npm run smoke:production
```

The smoke verifies health, provider status and match search shape. It must not print secrets.
```
```

- [ ] **Step 4: Run smoke locally against production**

Run:

```powershell
npm run smoke:production
```

Expected:

- JSON output with `"ok": true`.

- [ ] **Step 5: Commit**

Run:

```powershell
git add scripts/smoke-production.ts package.json package-lock.json docs/qa/production-smoke.md
git commit -m "test: add production smoke checks"
```

Acceptance criteria:

- One command verifies production API health after deploy.
- Failures identify the broken layer.

---

## Task 6: Provider observability and quota dashboard

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<new_timestamp>_provider_observability/migration.sql`
- Modify: `src/lib/services/apiUsageService.ts`
- Create: `src/lib/services/providerTelemetryService.ts`
- Modify: `src/app/api/health/route.ts`
- Modify: `src/components/health/HealthPanel.tsx`
- Create: `tests/integration/provider-telemetry.test.ts`

- [ ] **Step 1: Add failing test for telemetry aggregation**

Create `tests/integration/provider-telemetry.test.ts`:

```ts
import { describeWithDatabase } from "../helpers/database";

describeWithDatabase("Provider telemetry", ({ it }) => {
  it("summarizes provider failures and latency without exposing secrets", async () => {
    const { recordProviderTelemetry, getProviderTelemetrySnapshot } =
      await import("@/lib/services/providerTelemetryService");

    await recordProviderTelemetry({
      provider: "API-Football",
      operation: "fixtures",
      status: "success",
      latencyMs: 240,
      occurredAt: new Date("2026-06-27T00:00:00.000Z"),
    });
    await recordProviderTelemetry({
      provider: "API-Football",
      operation: "fixtures",
      status: "error",
      latencyMs: 900,
      occurredAt: new Date("2026-06-27T00:01:00.000Z"),
      errorCode: "429",
    });

    const snapshot = await getProviderTelemetrySnapshot();
    expect(JSON.stringify(snapshot)).not.toContain("f946");
    expect(snapshot[0]).toMatchObject({
      provider: "API-Football",
      total: 2,
      failures: 1,
    });
    expect(snapshot[0].averageLatencyMs).toBeGreaterThan(0);
  });
});
```

Run:

```powershell
npx vitest run tests/integration/provider-telemetry.test.ts
```

Expected:

- Skips if no Postgres `DATABASE_URL`, or fails because service/table does not exist when DB is configured.

- [ ] **Step 2: Add Prisma model**

Add:

```prisma
model ProviderTelemetry {
  id         String   @id @default(cuid())
  provider   String
  operation  String
  status     String
  latencyMs  Int
  errorCode  String?
  occurredAt DateTime @default(now())

  @@index([provider, occurredAt])
  @@index([operation, occurredAt])
}
```

- [ ] **Step 3: Add service**

Create `src/lib/services/providerTelemetryService.ts`:

```ts
import { prisma } from "@/lib/db/prisma";

export interface ProviderTelemetryEvent {
  provider: string;
  operation: string;
  status: "success" | "error" | "cache";
  latencyMs: number;
  errorCode?: string;
  occurredAt?: Date;
}

export async function recordProviderTelemetry(event: ProviderTelemetryEvent) {
  await prisma.providerTelemetry.create({
    data: {
      provider: event.provider,
      operation: event.operation,
      status: event.status,
      latencyMs: event.latencyMs,
      errorCode: event.errorCode,
      occurredAt: event.occurredAt ?? new Date(),
    },
  });
}

export async function getProviderTelemetrySnapshot() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const records = await prisma.providerTelemetry.findMany({
    where: { occurredAt: { gte: since } },
    orderBy: { occurredAt: "desc" },
  });

  const grouped = new Map<string, typeof records>();
  for (const record of records) {
    grouped.set(record.provider, [...(grouped.get(record.provider) ?? []), record]);
  }

  return Array.from(grouped.entries()).map(([provider, items]) => ({
    provider,
    total: items.length,
    failures: items.filter((item) => item.status === "error").length,
    averageLatencyMs: Math.round(
      items.reduce((sum, item) => sum + item.latencyMs, 0) / Math.max(1, items.length),
    ),
    lastObservedAt: items[0]?.occurredAt.toISOString() ?? null,
  }));
}
```

- [ ] **Step 4: Expose telemetry in health**

In `src/app/api/health/route.ts`, include:

```ts
const telemetry = await getProviderTelemetrySnapshot().catch(() => []);
```

and return:

```ts
telemetry,
```

- [ ] **Step 5: Render compact provider metrics**

In `src/components/health/HealthPanel.tsx`, show failures and average latency for matching provider telemetry.

- [ ] **Step 6: Run checks**

Run:

```powershell
npx prisma generate
npx prisma validate
npx vitest run tests/integration/provider-telemetry.test.ts
npm run lint
npm run build
```

- [ ] **Step 7: Commit**

Run:

```powershell
git add prisma/schema.prisma prisma/migrations src/lib/services/providerTelemetryService.ts src/app/api/health/route.ts src/components/health/HealthPanel.tsx tests/integration/provider-telemetry.test.ts
git commit -m "feat: add provider telemetry snapshot"
```

Acceptance criteria:

- Health panel reports usage plus basic provider reliability.
- No telemetry output includes secrets or request URLs with keys.

---

## Task 7: TheSportsDB secondary provider

**Files:**

- Create: `src/lib/providers/theSportsDb.ts`
- Create: `src/lib/providers/theSportsDbNormalizer.ts`
- Modify: `src/lib/providers/providerRegistry.ts`
- Modify: `src/lib/providers/providerConfig.ts`
- Modify: `.env.example`
- Modify: `docs/provider-setup.md`
- Create: `docs/data-sources/thesportsdb.md`
- Create: `tests/unit/theSportsDb.test.ts`

- [ ] **Step 1: Add failing tests**

Create `tests/unit/theSportsDb.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { TheSportsDbClient } from "@/lib/providers/theSportsDb";

describe("TheSportsDB client", () => {
  it("treats null event roots as an empty result", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ events: null }),
    );
    const client = new TheSportsDbClient({
      apiKey: "123",
      baseUrl: "https://www.thesportsdb.com/api/v1/json",
      timeoutMs: 8000,
      fetcher,
    });

    await expect(client.eventsByDay("2026-06-27")).resolves.toEqual([]);
  });

  it("fails clearly on rate limiting", async () => {
    const fetcher = vi.fn(async () => new Response("rate", { status: 429 }));
    const client = new TheSportsDbClient({
      apiKey: "123",
      baseUrl: "https://www.thesportsdb.com/api/v1/json",
      timeoutMs: 8000,
      fetcher,
    });

    await expect(client.eventsByDay("2026-06-27")).rejects.toThrow(
      "TheSportsDB rate limit reached",
    );
  });
});
```

Run:

```powershell
npx vitest run tests/unit/theSportsDb.test.ts
```

Expected:

- Fails because client does not exist.

- [ ] **Step 2: Implement minimal client**

Create `src/lib/providers/theSportsDb.ts`:

```ts
interface TheSportsDbConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
}

interface EventsByDayResponse {
  events: unknown[] | null;
}

export class TheSportsDbClient {
  private readonly fetcher: typeof fetch;

  constructor(private readonly config: TheSportsDbConfig) {
    this.fetcher = config.fetcher ?? fetch;
  }

  async request<T>(endpoint: string, params: Record<string, string>) {
    const url = new URL(
      `${this.config.baseUrl}/${this.config.apiKey}/${endpoint}`,
    );
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetcher(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (response.status === 429) {
      throw new Error("TheSportsDB rate limit reached");
    }
    if (!response.ok) {
      throw new Error(`TheSportsDB request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  async eventsByDay(date: string) {
    const body = await this.request<EventsByDayResponse>("eventsday.php", {
      d: date,
      s: "Soccer",
    });
    return body.events ?? [];
  }
}
```

- [ ] **Step 3: Add provider configuration**

In `.env.example`:

```env
THE_SPORTSDB_API_KEY=""
THE_SPORTSDB_BASE_URL="https://www.thesportsdb.com/api/v1/json"
THE_SPORTSDB_TIMEOUT_MS="8000"
```

In `providerConfig`, add a status entry with purpose:

```ts
"Enriquecimiento gratuito secundario: equipos, eventos, estadios, badges y contexto no crítico."
```

- [ ] **Step 4: Add docs**

Create `docs/data-sources/thesportsdb.md` with:

```markdown
# TheSportsDB

TheSportsDB is a secondary enrichment provider. It is not the primary live or last-hour lineup source. Keep API calls server-side and cache aggressively.

Runtime variables:

- `THE_SPORTSDB_API_KEY`
- `THE_SPORTSDB_BASE_URL`
- `THE_SPORTSDB_TIMEOUT_MS`

The free v1 API can return `200` with null roots such as `{ "events": null }`; normalizers must treat that as empty data, not a transport failure.
```

- [ ] **Step 5: Run checks**

Run:

```powershell
npx vitest run tests/unit/theSportsDb.test.ts tests/unit/provider-config.test.ts
npm run lint
npm run build
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/lib/providers/theSportsDb.ts src/lib/providers/theSportsDbNormalizer.ts src/lib/providers/providerRegistry.ts src/lib/providers/providerConfig.ts .env.example docs/provider-setup.md docs/data-sources/thesportsdb.md tests/unit/theSportsDb.test.ts
git commit -m "feat: add TheSportsDB secondary provider client"
```

Acceptance criteria:

- TheSportsDB is configurable and visible in provider status.
- Client handles null roots and 429.
- No key is exposed client-side.

---

## Task 8: OpenFootball offline import foundation

**Files:**

- Create: `src/lib/openfootball/types.ts`
- Create: `src/lib/openfootball/score.ts`
- Create: `src/lib/openfootball/normalize.ts`
- Create: `scripts/validate-openfootball.ts`
- Create: `scripts/import-openfootball.ts`
- Create: `docs/data-sources/openfootball.md`
- Create: `tests/unit/openfootball-score.test.ts`
- Create: `tests/unit/openfootball-normalize.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add ignored local data directory**

In `.gitignore`:

```gitignore
data/openfootball/
```

- [ ] **Step 2: Add score tests**

Create `tests/unit/openfootball-score.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeOpenFootballScore } from "@/lib/openfootball/score";

describe("normalizeOpenFootballScore", () => {
  it("normalizes tuple scores", () => {
    expect(normalizeOpenFootballScore([2, 1])).toEqual({
      fullTime: [2, 1],
      halfTime: undefined,
    });
  });

  it("normalizes object scores", () => {
    expect(normalizeOpenFootballScore({ ft: [3, 0], ht: [1, 0] })).toEqual({
      fullTime: [3, 0],
      halfTime: [1, 0],
    });
  });

  it("keeps future fixtures scoreless", () => {
    expect(normalizeOpenFootballScore(undefined)).toEqual({
      fullTime: undefined,
      halfTime: undefined,
    });
  });
});
```

- [ ] **Step 3: Implement score normalizer**

Create `src/lib/openfootball/score.ts`:

```ts
type TupleScore = [number, number];

function isTupleScore(value: unknown): value is TupleScore {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => Number.isInteger(item))
  );
}

export function normalizeOpenFootballScore(value: unknown) {
  if (isTupleScore(value)) {
    return { fullTime: value, halfTime: undefined };
  }
  if (value && typeof value === "object") {
    const record = value as { ft?: unknown; ht?: unknown };
    return {
      fullTime: isTupleScore(record.ft) ? record.ft : undefined,
      halfTime: isTupleScore(record.ht) ? record.ht : undefined,
    };
  }
  return { fullTime: undefined, halfTime: undefined };
}
```

- [ ] **Step 4: Add source metadata types**

Create `src/lib/openfootball/types.ts`:

```ts
export interface OpenFootballSourceSnapshot {
  repo: "openfootball/football.json" | "openfootball/worldcup.json";
  commit: string;
  importedAt: string;
  fileCount: number;
  matchCount: number;
}

export interface NormalizedOpenFootballMatch {
  sourceRepo: OpenFootballSourceSnapshot["repo"];
  sourceCommit: string;
  sourcePath: string;
  sourceIndex: number;
  externalId: string;
  competitionName: string;
  season: string;
  round?: string;
  group?: string;
  kickoffDate: string;
  kickoffTime?: string;
  homeTeamName: string;
  awayTeamName: string;
  scoreFullTime?: [number, number];
  scoreHalfTime?: [number, number];
  rawJson: unknown;
}
```

- [ ] **Step 5: Add docs**

Create `docs/data-sources/openfootball.md`:

```markdown
# OpenFootball

OpenFootball is an offline historical/import source. It is useful for World Cup structure, historical fixtures, league seasons and backtesting. It is not a live source for injuries, confirmed lineups, odds, referees or last-hour updates.

Rules:

- Do not fetch GitHub Raw during user requests.
- Import from a local ignored cache under `data/openfootball/`.
- Store repo, source path, commit SHA and import timestamp.
- Keep runtime data traceable back to the original file.
```

- [ ] **Step 6: Run checks**

Run:

```powershell
npx vitest run tests/unit/openfootball-score.test.ts tests/unit/openfootball-normalize.test.ts
npm run lint
```

- [ ] **Step 7: Commit**

Run:

```powershell
git add .gitignore src/lib/openfootball tests/unit/openfootball-score.test.ts tests/unit/openfootball-normalize.test.ts scripts/validate-openfootball.ts scripts/import-openfootball.ts docs/data-sources/openfootball.md
git commit -m "feat: add OpenFootball import foundation"
```

Acceptance criteria:

- OpenFootball has types, score normalization, and import rules.
- No runtime path depends on fetching GitHub.

---

## Task 9: Backtesting and calibration foundation

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `src/lib/backtesting/metrics.ts`
- Create: `src/lib/backtesting/calibration.ts`
- Create: `tests/unit/backtesting-metrics.test.ts`
- Create: `docs/model-validation/backtesting.md`

- [ ] **Step 1: Add metric tests**

Create `tests/unit/backtesting-metrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { brierScore, logLoss } from "@/lib/backtesting/metrics";

describe("backtesting metrics", () => {
  it("computes Brier score for a three-way football market", () => {
    expect(
      brierScore(
        { home: 0.5, draw: 0.25, away: 0.25 },
        "home",
      ),
    ).toBeCloseTo(0.375);
  });

  it("keeps log loss finite with probability clipping", () => {
    expect(logLoss({ home: 0, draw: 0.4, away: 0.6 }, "home")).toBeLessThan(20);
  });
});
```

- [ ] **Step 2: Implement metrics**

Create `src/lib/backtesting/metrics.ts`:

```ts
type Outcome = "home" | "draw" | "away";
type Probabilities = Record<Outcome, number>;

export function brierScore(probabilities: Probabilities, outcome: Outcome) {
  return (["home", "draw", "away"] as Outcome[]).reduce((sum, key) => {
    const observed = key === outcome ? 1 : 0;
    return sum + (probabilities[key] - observed) ** 2;
  }, 0);
}

export function logLoss(probabilities: Probabilities, outcome: Outcome) {
  const clipped = Math.min(1 - 1e-12, Math.max(1e-12, probabilities[outcome]));
  return -Math.log(clipped);
}
```

- [ ] **Step 3: Add model validation docs**

Create `docs/model-validation/backtesting.md`:

```markdown
# Backtesting and Calibration

The app must not claim model accuracy without historical validation. Initial validation metrics:

- Brier score for calibrated probabilities.
- Log loss for probabilistic sharpness.
- Ranked probability score for ordered scoreline/gols markets.
- Closing-line comparison when odds history exists.
- ROI simulation only as a diagnostic, never as a guarantee.
```

- [ ] **Step 4: Run checks**

Run:

```powershell
npx vitest run tests/unit/backtesting-metrics.test.ts
npm run lint
npm run build
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/lib/backtesting tests/unit/backtesting-metrics.test.ts docs/model-validation/backtesting.md prisma/schema.prisma
git commit -m "feat: add backtesting metric foundation"
```

Acceptance criteria:

- Basic calibration metrics are implemented and tested.
- Documentation makes model accuracy claims conditional on evidence.

---

## Task 10: Premium UI polish and visual hierarchy

**Files:**

- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/home/DateMatchFinder.tsx`
- Modify: `src/components/analysis/**`
- Modify: `tests/e2e/core-flow.spec.ts`

- [ ] **Step 1: Add UI contract test for evidence/status text**

In `tests/e2e/core-flow.spec.ts`, add:

```ts
test("la home comunica estado de datos y metodología sin parecer demo plana", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Poisson + Dixon–Coles")).toBeVisible();
  await expect(page.getByText("Elo + logística")).toBeVisible();
  await expect(page.getByText("Estado del sistema")).toBeVisible();
  await expect(page.getByRole("button", { name: "Buscar partidos" })).toBeVisible();
});
```

- [ ] **Step 2: Add result quality chips**

In `DateMatchFinder`, render chips after `result-meta`:

```tsx
<div className="result-quality-chips" aria-label="Calidad de datos">
  <span>Origen: {result.mode === "api" ? "API" : "Demo"}</span>
  <span>Fuente: {result.source}</span>
  <span>Filtro: {competition === "all" ? "Global" : competition}</span>
</div>
```

- [ ] **Step 3: Style premium chips and result grouping**

In `globals.css`:

```css
.result-quality-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.8rem 0 1rem;
}

.result-quality-chips span {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: rgba(255, 255, 255, 0.05);
  color: var(--muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

- [ ] **Step 4: Add mobile affordance**

Add a subtle scroll hint to horizontal rails:

```css
.analysis-tabs::after,
.mobile-action-bar::after {
  content: "";
  flex: 0 0 1rem;
}
```

- [ ] **Step 5: Validate rendered UI**

Run:

```powershell
npm run build
npm run test:e2e
```

Then validate visually through browser automation at:

- Desktop: `1280x720`
- Mobile-like: `390x844`

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/app/page.tsx src/app/globals.css src/components/home/DateMatchFinder.tsx src/components/analysis tests/e2e/core-flow.spec.ts
git commit -m "feat: polish premium football intelligence UI"
```

Acceptance criteria:

- UI feels intentional and data-rich.
- Search/filter states are obvious.
- Mobile remains usable.

---

## Task 11: Auth and workspace isolation decision

**Files:**

- Create: `docs/security/auth-workspace-decision.md`
- Modify later only after decision: Prisma schema, route guards, UI account surfaces.

Context:

- Current app is not ready for untrusted multiuser manual overrides.
- Manual changes can affect shared match state.

- [ ] **Step 1: Write decision document**

Create `docs/security/auth-workspace-decision.md`:

```markdown
# Auth and Workspace Isolation Decision

## Problem

Manual overrides, saved snapshots and analysis histories are shared unless isolated. Public or multiuser usage needs identity, roles and workspace boundaries.

## Minimal roles

- Owner: manages workspace and provider settings.
- Analyst: creates overrides and analysis runs.
- Viewer: reads reports only.

## Data requiring workspace ownership

- Manual overrides.
- Analysis runs.
- Export history.
- Provider usage budgets.
- Imported datasets.

## Initial recommendation

Start with a single-owner workspace model before public accounts. Add full auth only when the product moves beyond private use.
```

- [ ] **Step 2: Identify impacted tables**

Add a section listing:

```markdown
- MatchSnapshot
- AnalysisRun
- ManualOverride
- ApiUsage
- ProviderTelemetry
- DataSourceSnapshot
```

- [ ] **Step 3: Commit**

Run:

```powershell
git add docs/security/auth-workspace-decision.md
git commit -m "docs: define auth and workspace isolation decision"
```

Acceptance criteria:

- No auth implementation starts without a clear ownership model.
- Risks of public/multiuser use are documented.

---

## Task 12: OpenAI Agents SDK internal audit prototype

**Files:**

- Create after approval only: `agents/amp_audit_agent/agent.py`
- Create after approval only: `agents/amp_audit_agent/main.py`
- Create after approval only: `agents/amp_audit_agent/pyproject.toml`
- Create after approval only: `agents/amp_audit_agent/evals/cases.jsonl`
- Create after approval only: `agents/amp_audit_agent/evals/run_local.py`
- Create after approval only: `docs/agents/amp-audit-agent.md`

Gate:

- Do not implement this task until the `OPENAI_API_KEY` flow is approved and configured through the OpenAI Platform connector.
- Do not commit any API key or generated secret.
- Read current official Agents SDK docs immediately before implementation.

- [ ] **Step 1: Create agent brief**

Create `docs/agents/amp-audit-agent.md`:

```markdown
# AMP Audit Agent Brief

Goal: generate internal QA/audit reports from existing app endpoints, source files and smoke results.

Allowed inputs:

- Production URL.
- Local smoke JSON.
- Existing audit docs.
- Non-secret provider status.

Forbidden outputs:

- Betting guarantees.
- Secret values.
- Unverified claims of model accuracy.

Expected output:

- Markdown audit with findings, severity, evidence, and recommended next task.
```

- [ ] **Step 2: Credential gate**

Use the OpenAI Platform connector flow for `OPENAI_API_KEY`. The implementation agent must not write setup instructions that ask the user to paste keys into chat.

- [ ] **Step 3: Smallest runnable prototype**

Implement a single-agent Python prototype with:

```text
agents/amp_audit_agent/
  agent.py
  main.py
  pyproject.toml
  evals/
    cases.jsonl
    run_local.py
```

- [ ] **Step 4: Local eval harness**

Add cases for:

- Health endpoint connected.
- Provider missing.
- Quota warning.
- No secrets in report.
- Avoiding prediction guarantees.

- [ ] **Step 5: Smoke command**

Expected command:

```powershell
cd agents/amp_audit_agent
uv run python main.py --smoke
uv run python evals/run_local.py
```

- [ ] **Step 6: Commit after smoke**

Run:

```powershell
git add agents/amp_audit_agent docs/agents/amp-audit-agent.md
git commit -m "feat: add internal AMP audit agent prototype"
```

Acceptance criteria:

- Agent is internal QA tooling only.
- It has evals.
- It requires credentials safely.
- It does not alter user-facing predictions.

---

## Recommended execution order

Execute in this order:

1. Task 1 — Fresh baseline audit.
2. Task 2 — Match finder UX no-blank/large-results fix.
3. Task 4 — Deployment/Neon docs cleanup.
4. Task 5 — Production smoke workflow.
5. Task 3 — Competition/provider filter alignment.
6. Task 6 — Provider observability.
7. Task 10 — Premium UI polish.
8. Task 7 — TheSportsDB.
9. Task 8 — OpenFootball.
10. Task 9 — Backtesting/calibration.
11. Task 11 — Auth/workspace decision.
12. Task 12 — OpenAI Agents SDK prototype after credential approval.

## Subagent dispatch batches

### Batch A — can run in parallel

- QA Baseline Agent: Task 1.
- Docs Consistency Agent: Task 4.
- Frontend Search UX Agent: Task 2.

Coordinator checks after Batch A:

```powershell
npm run lint
npm test
npm run build
```

### Batch B — can run after Batch A

- Provider Reliability Agent: Task 3.
- Production QA Agent: Task 5.
- Observability Agent: Task 6.

Coordinator checks after Batch B:

```powershell
npx prisma validate
npm run lint
npm test
npm run build
npm run smoke:production
```

### Batch C — larger feature work

- Frontend Polish Agent: Task 10.
- TheSportsDB Agent: Task 7.
- OpenFootball Agent: Task 8.

Coordinator checks after Batch C:

```powershell
npm run lint
npm test
npm run build
npm run test:e2e
```

### Batch D — strategic foundations

- Model Validation Agent: Task 9.
- Security/Auth Decision Agent: Task 11.
- OpenAI Agents SDK Agent: Task 12 only after credential approval.

## Done criteria for this master plan

- Every task has a file owner.
- Every code task starts with a failing test or explicit verification command.
- Every deployment-affecting task includes Netlify/production verification.
- Every provider task keeps secrets server-side only.
- Every data-source task records source provenance.
- UI improvements preserve responsible-gaming language and avoid guarantees.

