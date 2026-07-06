# P0 Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir la probabilidad de goles por equipo y lograr que los cambios manuales estructurados alteren realmente el dataset y el pronóstico.

**Architecture:** El motor seguirá siendo una función TypeScript pura. Una nueva capa pura aplicará overrides estructurados sobre una copia del `MatchDataset`; el servicio cargará los overrides persistidos antes de invocar el análisis. La fórmula de goles por equipo se derivará directamente de la matriz Dixon–Coles.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Prisma 7, SQLite, Playwright.

---

### Task 1: Regression test for team goal probability

**Files:**
- Modify: `tests/integration/analysis-engine.test.ts`
- Modify: `src/lib/analysis/analysisEngine.ts`

- [ ] **Step 1: Write the failing regression test**

Calcular independientemente la probabilidad de que el visitante marque al menos
dos goles sumando todas las celdas correspondientes de la matriz y compararla
con el mercado publicado.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/integration/analysis-engine.test.ts`

Expected: FAIL porque el mercado actual devuelve aproximadamente 82.3% y la
matriz aproximadamente 46.5%.

- [ ] **Step 3: Implement the minimal matrix aggregation**

Sumar la probabilidad de todas las celdas cuya columna visitante sea mayor o
igual a dos.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- tests/integration/analysis-engine.test.ts`

Expected: PASS.

### Task 2: Structured manual override

**Files:**
- Create: `src/lib/overrides/applyManualOverrides.ts`
- Modify: `src/types/domain.ts`
- Modify: `src/lib/validation/schemas.ts`
- Modify: `src/lib/services/analysisService.ts`
- Modify: `src/app/api/match/[id]/overrides/route.ts`
- Modify: `src/components/analysis/UpdatePanel.tsx`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_structured_manual_overrides/migration.sql`
- Modify: `tests/integration/api-routes.test.ts`
- Create: `tests/unit/manual-overrides.test.ts`

- [ ] **Step 1: Write failing pure and route tests**

Una baja de impacto alto para el equipo local debe reducir su `homeGoals` y su
probabilidad de victoria. La ruta debe persistir `teamId` e `impact`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:
`npm test -- tests/unit/manual-overrides.test.ts tests/integration/api-routes.test.ts`

Expected: FAIL porque el contrato y la aplicación todavía no existen.

- [ ] **Step 3: Add structured override fields**

Persistir `teamId`, `player`, `impact` y `value` como campos opcionales. Exigir
`teamId` e `impact` para bajas mediante validación Zod.

- [ ] **Step 4: Apply overrides before analysis**

Clonar el dataset, añadir evidencia manual y ajustar de forma conservadora las
estadísticas del equipo afectado. Incluir los overrides en el hash del snapshot.

- [ ] **Step 5: Expose the structured fields in the drawer**

Mostrar equipo e impacto cuando el tipo sea una baja.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:
`npm test -- tests/unit/manual-overrides.test.ts tests/integration/api-routes.test.ts`

Expected: PASS.

### Task 3: Full verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run complete automated checks**

Run:

```powershell
npm test
npm run lint
npm run build
npx prisma validate
npx prisma migrate status
npx playwright test
npm audit
```

- [ ] **Step 2: Inspect the final diff**

Run:

```powershell
git diff --check
git status -sb
```

- [ ] **Step 3: Commit and push**

```powershell
git add --all
git commit -m "fix: correct P0 analysis defects"
git push
```
