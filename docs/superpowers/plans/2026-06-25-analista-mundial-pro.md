# Analista Mundial Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una aplicación Next.js local-first para análisis prepartido multicompetición, con fuentes gratuitas, trazabilidad, modelos probabilísticos auditables y el dashboard “Cabina editorial” aprobado.

**Architecture:** Next.js App Router expone páginas y rutas internas; adaptadores desacoplados normalizan proveedores gratuitos hacia un dominio común. SQLite/Prisma conserva snapshots, evidencia y revisiones, mientras un motor TypeScript puro calcula Elo, Poisson/Dixon–Coles, Monte Carlo, probabilidades de mercado, valor esperado y arbitraje.

**Tech Stack:** Next.js, React, TypeScript estricto, Prisma + SQLite, Zod, Vitest, Testing Library, Playwright, CSS nativo con tokens.

---

## Mapa de archivos

```text
src/
  app/
    api/
      competitions/route.ts
      matches/route.ts
      match/[id]/route.ts
      match/[id]/analyze/route.ts
      match/[id]/export/route.ts
      match/[id]/overrides/route.ts
      match/[id]/refresh/route.ts
      usage/route.ts
    match/[id]/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    home/DateMatchFinder.tsx
    analysis/AnalysisCabin.tsx
    analysis/AnalysisSection.tsx
    analysis/MarketTable.tsx
    analysis/SourceLedger.tsx
    analysis/UpdatePanel.tsx
    shared/ResponsibleGamingNotice.tsx
  data/demo.ts
  lib/
    analysis/analysisEngine.ts
    analysis/confidence.ts
    analysis/features.ts
    db/prisma.ts
    evidence/resolveEvidence.ts
    export/renderAnalysisHtml.ts
    models/dixonColes.ts
    models/elo.ts
    models/logistic.ts
    models/monteCarlo.ts
    models/odds.ts
    models/poisson.ts
    providers/apiFootball.ts
    providers/footballData.ts
    providers/openMeteo.ts
    providers/oddsApi.ts
    providers/providerRegistry.ts
    providers/types.ts
    services/analysisService.ts
    services/matchService.ts
    services/refreshService.ts
    validation/schemas.ts
  types/domain.ts
prisma/schema.prisma
tests/
  unit/
  integration/
  e2e/
```

### Task 1: Scaffold y sistema visual base

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/components/shared/ResponsibleGamingNotice.tsx`
- Test: `tests/unit/responsible-notice.test.tsx`

- [ ] **Step 1: Crear el scaffold Next.js**

Run:

```powershell
npx create-next-app@latest scaffold --ts --eslint --app --src-dir --use-npm --no-tailwind --import-alias "@/*"
```

Move the generated project contents into the worktree root, preserving `docs/` and `.gitignore`.

- [ ] **Step 2: Instalar la infraestructura de pruebas y dominio**

Run:

```powershell
npm install zod @prisma/client
npm install -D prisma vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```

- [ ] **Step 3: Escribir la prueba roja del aviso responsable**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponsibleGamingNotice } from "@/components/shared/ResponsibleGamingNotice";

describe("ResponsibleGamingNotice", () => {
  it("muestra que el análisis no garantiza resultados", () => {
    render(<ResponsibleGamingNotice />);
    expect(screen.getByText(/no garantiza resultados/i)).toBeInTheDocument();
    expect(screen.getByText(/riesgo de pérdida de dinero/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Ejecutar la prueba y comprobar que falla por módulo ausente**

Run: `npm test -- tests/unit/responsible-notice.test.tsx`

Expected: FAIL porque `ResponsibleGamingNotice` todavía no existe.

- [ ] **Step 5: Implementar el componente y tokens globales**

```tsx
export function ResponsibleGamingNotice() {
  return (
    <aside className="responsible-notice" aria-label="Aviso de juego responsable">
      Este análisis es probabilístico y no garantiza resultados. Las apuestas
      deportivas implican riesgo de pérdida de dinero. No apuestes dinero que
      no puedas perder. Usa esta información solo como apoyo analítico.
    </aside>
  );
}
```

Define en `globals.css` los tokens `--bg`, `--surface`, `--line`, `--text`, `--muted`, `--emerald`, `--amber`, `--coral`, tipografía de datos y tipografía editorial.

- [ ] **Step 6: Ejecutar prueba, lint y commit**

Run: `npm test -- tests/unit/responsible-notice.test.tsx && npm run lint`

Expected: PASS y cero errores.

```powershell
git add package.json package-lock.json tsconfig.json vitest.config.ts playwright.config.ts src tests
git commit -m "chore: scaffold Analista Mundial Pro"
```

### Task 2: Dominio, Prisma y evidencia reproducible

**Files:**
- Create: `src/types/domain.ts`
- Create: `src/lib/validation/schemas.ts`
- Create: `src/lib/evidence/resolveEvidence.ts`
- Create: `src/lib/db/prisma.ts`
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Test: `tests/unit/evidence.test.ts`
- Test: `tests/integration/database.test.ts`

- [ ] **Step 1: Escribir prueba roja de prioridad de evidencia**

```ts
import { describe, expect, it } from "vitest";
import { resolveEvidence } from "@/lib/evidence/resolveEvidence";

describe("resolveEvidence", () => {
  it("prefiere la fuente oficial más reciente", () => {
    const result = resolveEvidence([
      { value: "4-3-3", status: "expected", sourceType: "provider", observedAt: "2026-06-25T10:00:00Z" },
      { value: "4-2-3-1", status: "confirmed", sourceType: "official", observedAt: "2026-06-25T11:00:00Z" },
    ]);
    expect(result.value).toBe("4-2-3-1");
    expect(result.status).toBe("confirmed");
  });
});
```

- [ ] **Step 2: Ejecutar y verificar RED**

Run: `npm test -- tests/unit/evidence.test.ts`

Expected: FAIL por export ausente.

- [ ] **Step 3: Definir tipos y resolución**

Define discriminated unions para `EvidenceStatus`, `SourceType`, `MatchStatus`, `NormalizedMatch`, `MatchDataset`, `Prediction`, `AnalysisResult` y `ManualOverride`. Implementa prioridad `official > provider > manual > inferred`, usando recencia como desempate y devolviendo `conflict` cuando dos fuentes oficiales recientes discrepen.

- [ ] **Step 4: Ejecutar la prueba y verificar GREEN**

Run: `npm test -- tests/unit/evidence.test.ts`

Expected: PASS.

- [ ] **Step 5: Crear el esquema Prisma**

Incluye modelos `Competition`, `Team`, `Player`, `Match`, `MatchSnapshot`, `EvidenceRecord`, `OddsSnapshot`, `AnalysisRun`, `Prediction`, `ModelVersion`, `ManualOverride` y `ApiUsage`, con índices por fecha, competición, fixture externo y snapshot.

- [ ] **Step 6: Migrar y probar persistencia**

```ts
it("persiste un partido y su snapshot", async () => {
  const match = await prisma.match.create({
    data: {
      externalId: "demo-col-bra",
      kickoff: new Date("2026-06-15T18:00:00Z"),
      status: "SCHEDULED",
      competition: { create: { externalId: "wc-2026", name: "FIFA World Cup", kind: "NATIONAL" } },
      homeTeam: { create: { externalId: "col", name: "Colombia", kind: "NATIONAL" } },
      awayTeam: { create: { externalId: "bra", name: "Brasil", kind: "NATIONAL" } },
    },
  });
  expect(match.externalId).toBe("demo-col-bra");
});
```

Run: `npx prisma migrate dev --name init && npm test -- tests/integration/database.test.ts`

Expected: migración exitosa y PASS.

- [ ] **Step 7: Commit**

```powershell
git add prisma src/types src/lib/db src/lib/evidence src/lib/validation tests
git commit -m "feat: add auditable football domain"
```

### Task 3: Adaptadores gratuitos, demo y presupuesto de API

**Files:**
- Create: `src/lib/providers/types.ts`
- Create: `src/lib/providers/apiFootball.ts`
- Create: `src/lib/providers/footballData.ts`
- Create: `src/lib/providers/oddsApi.ts`
- Create: `src/lib/providers/openMeteo.ts`
- Create: `src/lib/providers/providerRegistry.ts`
- Create: `src/data/demo.ts`
- Create: `src/lib/services/matchService.ts`
- Test: `tests/unit/provider-registry.test.ts`
- Test: `tests/integration/match-service.test.ts`

- [ ] **Step 1: Escribir prueba roja del fallback demo**

```ts
it("usa demo claramente etiquetado cuando no hay claves", async () => {
  const service = createMatchService({ env: {} });
  const result = await service.listByDate("2026-06-15");
  expect(result.mode).toBe("demo");
  expect(result.matches[0]?.dataOrigin).toBe("DEMO");
});
```

- [ ] **Step 2: Verificar RED**

Run: `npm test -- tests/integration/match-service.test.ts`

Expected: FAIL porque el servicio no existe.

- [ ] **Step 3: Implementar contratos**

```ts
export interface FootballProvider {
  readonly id: string;
  listMatches(date: string, competition?: string): Promise<ProviderResult<NormalizedMatch[]>>;
  getMatch(id: string): Promise<ProviderResult<MatchDataset>>;
}

export interface OddsProvider {
  readonly id: string;
  getOdds(match: NormalizedMatch): Promise<ProviderResult<NormalizedOdds[]>>;
}
```

Todos los resultados incluyen `source`, `fetchedAt`, `quota`, `warnings` y `isStale`.

- [ ] **Step 4: Implementar adaptadores server-only**

Usa `fetch` con timeout, Zod para validar respuestas, mensajes parciales y claves leídas únicamente desde `process.env`. API-Football es principal, Football-Data.org respaldo, Odds API bajo demanda y Open-Meteo por coordenadas del estadio.

- [ ] **Step 5: Implementar cuota y caché**

Antes de cada llamada consulta `ApiUsage`; evita repetir una consulta fresca y reserva solicitudes para la ventana T−90/T−15. Un agotamiento devuelve el último snapshot con `isStale: true`.

- [ ] **Step 6: Verificar pruebas**

Run: `npm test -- tests/unit/provider-registry.test.ts tests/integration/match-service.test.ts`

Expected: PASS sin llamadas reales de red.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/providers src/lib/services/matchService.ts src/data tests
git commit -m "feat: add free football data providers"
```

### Task 4: Núcleo matemático

**Files:**
- Create: `src/lib/models/poisson.ts`
- Create: `src/lib/models/dixonColes.ts`
- Create: `src/lib/models/elo.ts`
- Create: `src/lib/models/logistic.ts`
- Create: `src/lib/models/monteCarlo.ts`
- Create: `src/lib/models/odds.ts`
- Test: `tests/unit/poisson.test.ts`
- Test: `tests/unit/elo.test.ts`
- Test: `tests/unit/odds.test.ts`
- Test: `tests/unit/monte-carlo.test.ts`

- [ ] **Step 1: Escribir pruebas rojas de Poisson**

```ts
it("produce una distribución que suma aproximadamente uno", () => {
  const distribution = poissonDistribution(1.6, 10);
  expect(distribution.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 4);
});

it("deriva 1X2 desde una matriz de marcadores", () => {
  const result = scoreMatrix(1.1, 1.6, 8);
  expect(result.home + result.draw + result.away).toBeCloseTo(1, 6);
  expect(result.away).toBeGreaterThan(result.home);
});
```

- [ ] **Step 2: Verificar RED**

Run: `npm test -- tests/unit/poisson.test.ts`

Expected: FAIL por funciones ausentes.

- [ ] **Step 3: Implementar Poisson y Dixon–Coles**

Implementa factorial estable, distribución truncada con normalización, matriz de marcadores, corrección `tau` para 0-0/0-1/1-0/1-1 y derivación de 1X2, over/under y ambos marcan.

- [ ] **Step 4: Verificar GREEN**

Run: `npm test -- tests/unit/poisson.test.ts`

Expected: PASS.

- [ ] **Step 5: Escribir e implementar Elo y logística**

Prueba que una victoria del equipo débil aumenta más su Elo y que `logisticProbability([0], [0])` devuelve 0.5. Implementa actualización Elo configurable y una inferencia logística pura con coeficientes versionados.

- [ ] **Step 6: Escribir e implementar cuotas, valor y arbitraje**

```ts
it("elimina el margen normalizando probabilidades implícitas", () => {
  expect(removeOverround([2.0, 3.5, 4.0]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
});

it("detecta arbitraje solo cuando la suma de inversas es menor que uno", () => {
  expect(detectArbitrage([2.12, 3.7, 4.4]).isOpportunity).toBe(true);
});
```

Implementa `impliedProbability`, `removeOverround`, `expectedValue`, `minimumValueOdd`, `detectArbitrage` y reparto teórico de stakes.

- [ ] **Step 7: Implementar Monte Carlo reproducible**

Acepta una semilla; muestrea intensidades y escenarios de alineación; devuelve medias, percentiles e intervalos. Prueba que la misma semilla produce el mismo resultado.

- [ ] **Step 8: Ejecutar suite matemática y commit**

Run: `npm test -- tests/unit/poisson.test.ts tests/unit/elo.test.ts tests/unit/odds.test.ts tests/unit/monte-carlo.test.ts`

Expected: PASS.

```powershell
git add src/lib/models tests/unit
git commit -m "feat: add probabilistic football models"
```

### Task 5: Motor de análisis, confianza y mercados

**Files:**
- Create: `src/lib/analysis/features.ts`
- Create: `src/lib/analysis/confidence.ts`
- Create: `src/lib/analysis/analysisEngine.ts`
- Create: `src/lib/services/analysisService.ts`
- Test: `tests/unit/confidence.test.ts`
- Test: `tests/integration/analysis-engine.test.ts`

- [ ] **Step 1: Escribir prueba roja del análisis**

```ts
it("genera probabilidades normalizadas y mercados trazables", () => {
  const result = analyzeMatch(completeDemoDataset);
  expect(result.mainProbabilities.home + result.mainProbabilities.draw + result.mainProbabilities.away).toBeCloseTo(100, 1);
  expect(result.markets.length).toBeGreaterThan(10);
  expect(result.markets.every((market) => market.reason && market.risk)).toBe(true);
});
```

- [ ] **Step 2: Verificar RED**

Run: `npm test -- tests/integration/analysis-engine.test.ts`

Expected: FAIL por motor ausente.

- [ ] **Step 3: Construir características y disponibilidad**

Calcula forma ponderada, Elo, ataque, defensa, sede, descanso, bajas, contexto, disciplina y clima. Cada característica incluye `value`, `status`, `sourceIds` y `freshness`.

- [ ] **Step 4: Implementar confianza**

La confianza combina cobertura, frescura, acuerdo entre fuentes, calibración disponible, estabilidad entre modelos y confirmación de alineaciones. Limita la confianza a 6/10 cuando faltan alineaciones y a 4/10 cuando faltan estadísticas base.

- [ ] **Step 5: Implementar análisis estructurado**

Genera resumen ejecutivo determinista, 1X2, top 5 marcadores, goles, corners, tarjetas, faltas, tiros, jugadores cuando existan, porteros, fueras de juego, escenarios, posibles valores, riesgos y alertas. Un mercado sin soporte se marca `unavailable` y no recibe una probabilidad inventada.

- [ ] **Step 6: Añadir persistencia de versión**

`analysisService` crea `AnalysisRun`, enlaza snapshot y `ModelVersion`, persiste predicciones y reutiliza un análisis idéntico si no cambió el hash de entrada.

- [ ] **Step 7: Ejecutar pruebas y commit**

Run: `npm test -- tests/unit/confidence.test.ts tests/integration/analysis-engine.test.ts`

Expected: PASS.

```powershell
git add src/lib/analysis src/lib/services/analysisService.ts tests
git commit -m "feat: add auditable match analysis engine"
```

### Task 6: API interna, actualización y cambios manuales

**Files:**
- Create: `src/app/api/competitions/route.ts`
- Create: `src/app/api/matches/route.ts`
- Create: `src/app/api/match/[id]/route.ts`
- Create: `src/app/api/match/[id]/analyze/route.ts`
- Create: `src/app/api/match/[id]/refresh/route.ts`
- Create: `src/app/api/match/[id]/overrides/route.ts`
- Create: `src/app/api/usage/route.ts`
- Create: `src/lib/services/refreshService.ts`
- Test: `tests/integration/api-routes.test.ts`

- [ ] **Step 1: Escribir pruebas rojas de validación**

```ts
it("rechaza una fecha inválida", async () => {
  const response = await GET(new Request("http://local/api/matches?date=25-06-2026"));
  expect(response.status).toBe(400);
});

it("guarda un cambio manual con nota y recalcula", async () => {
  const response = await POST_OVERRIDE(validOverrideRequest);
  expect(response.status).toBe(201);
  expect((await response.json()).analysisUpdated).toBe(true);
});
```

- [ ] **Step 2: Verificar RED**

Run: `npm test -- tests/integration/api-routes.test.ts`

Expected: FAIL por rutas ausentes.

- [ ] **Step 3: Implementar rutas**

Valida con Zod, devuelve errores RFC 7807 simplificados y serializa fechas en ISO. `refresh` consulta únicamente recursos vencidos; `overrides` registra evidencia manual y dispara análisis nuevo; `usage` expone consumo sin revelar claves.

- [ ] **Step 4: Verificar rutas**

Run: `npm test -- tests/integration/api-routes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/app/api src/lib/services/refreshService.ts tests/integration
git commit -m "feat: expose match analysis API"
```

### Task 7: Inicio y Cabina editorial interactiva

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/match/[id]/page.tsx`
- Create: `src/components/home/DateMatchFinder.tsx`
- Create: `src/components/analysis/AnalysisCabin.tsx`
- Create: `src/components/analysis/AnalysisSection.tsx`
- Create: `src/components/analysis/MarketTable.tsx`
- Create: `src/components/analysis/SourceLedger.tsx`
- Create: `src/components/analysis/UpdatePanel.tsx`
- Create: `src/components/analysis/ProbabilitySummary.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/date-match-finder.test.tsx`
- Test: `tests/unit/analysis-cabin.test.tsx`
- Test: `tests/e2e/core-flow.spec.ts`

- [ ] **Step 1: Crear la referencia visual final con Image Gen**

Generar una pantalla completa de escritorio y una vista móvil de la Cabina editorial aprobada: barra lateral con 10 categorías desplegables, subsecciones horizontales, verde petróleo, esmeralda, ámbar y coral, tipografía editorial, tablas legibles y ninguna cuadrícula SaaS genérica.

- [ ] **Step 2: Extraer tokens y bloqueo de copy**

Registrar en el código los colores, escala tipográfica, radios, líneas, densidad, navegación, controles e iconos observados. Copy inicial permitido: “Analista Mundial Pro”, “Buscar partidos”, “Actualizar datos”, “Cambios manuales”, “Exportar HTML” y el aviso responsable.

- [ ] **Step 3: Escribir prueba roja del buscador**

```tsx
it("busca y permite seleccionar un partido", async () => {
  render(<DateMatchFinder initialDate="2026-06-15" />);
  await userEvent.click(screen.getByRole("button", { name: /buscar partidos/i }));
  expect(await screen.findByText(/Colombia vs Brasil/i)).toBeVisible();
});
```

- [ ] **Step 4: Implementar la pantalla inicial**

Incluye selección de fecha y competición, estados loading/error/vacío/demo/caché, lista visual de partidos y navegación accesible al análisis.

- [ ] **Step 5: Escribir prueba roja de navegación profunda**

```tsx
it("abre Mercados y selecciona Goles", async () => {
  render(<AnalysisCabin analysis={demoAnalysis} />);
  await userEvent.click(screen.getByRole("button", { name: /05 · mercados/i }));
  await userEvent.click(screen.getByRole("button", { name: /^goles$/i }));
  expect(screen.getByRole("heading", { name: /mercado de goles/i })).toBeVisible();
});
```

- [ ] **Step 6: Implementar Cabina editorial**

Usa componentes enfocados, tablas semánticas, barras de confianza, estados de evidencia, ledger de fuentes, historial y panel manual. No mover texto funcional a imágenes. En móvil, convertir la barra lateral en navegación horizontal/desplegable sin perder subsecciones.

- [ ] **Step 7: Implementar el flujo E2E**

```ts
test("analiza, modifica y actualiza un partido", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Fecha").fill("2026-06-15");
  await page.getByRole("button", { name: "Buscar partidos" }).click();
  await page.getByText("Colombia vs Brasil").click();
  await page.getByRole("button", { name: /Cambios manuales/i }).click();
  await page.getByLabel("Descripción del cambio").fill("Delantero titular descartado");
  await page.getByRole("button", { name: /Guardar y recalcular/i }).click();
  await expect(page.getByText(/Análisis actualizado manualmente/i)).toBeVisible();
});
```

- [ ] **Step 8: Ejecutar pruebas y commit**

Run: `npm test -- tests/unit/date-match-finder.test.tsx tests/unit/analysis-cabin.test.tsx && npx playwright test tests/e2e/core-flow.spec.ts`

Expected: PASS.

```powershell
git add src/app src/components tests
git commit -m "feat: build editorial analysis cabin"
```

### Task 8: Exportación, documentación y verificación completa

**Files:**
- Create: `src/lib/export/renderAnalysisHtml.ts`
- Create: `src/app/api/match/[id]/export/route.ts`
- Create: `.env.example`
- Create: `README.md`
- Test: `tests/unit/export-html.test.ts`
- Test: `tests/e2e/responsive.spec.ts`

- [ ] **Step 1: Escribir prueba roja de exportación segura**

```ts
it("genera HTML autónomo sin secretos", () => {
  const html = renderAnalysisHtml(demoAnalysis);
  expect(html).toContain("<!doctype html>");
  expect(html).toContain("Este análisis es probabilístico");
  expect(html).not.toContain("FOOTBALL_API_KEY");
  expect(html).not.toContain("OPENAI_API_KEY");
});
```

- [ ] **Step 2: Verificar RED**

Run: `npm test -- tests/unit/export-html.test.ts`

Expected: FAIL por renderer ausente.

- [ ] **Step 3: Implementar exportación**

Escapa contenido, incorpora CSS, resumen, mercados, evidencia, metodología, snapshot, fecha de generación y aviso responsable. La ruta devuelve `text/html` con nombre de archivo sanitizado.

- [ ] **Step 4: Documentar instalación y configuración**

`.env.example`:

```dotenv
FOOTBALL_API_KEY=
FOOTBALL_DATA_API_KEY=
ODDS_API_KEY=
OPENAI_API_KEY=
DATABASE_URL="file:./dev.db"
```

README incluye `npm install`, `npx prisma migrate dev`, `npm run dev`, claves opcionales, modo demo, límites gratuitos, uso, pruebas y advertencia.

- [ ] **Step 5: Verificación funcional y responsive**

Run:

```powershell
npm test
npm run lint
npm run build
npx playwright test
```

Expected: todas las pruebas pasan, lint sin errores, build con exit code 0 y E2E sin fallos.

- [ ] **Step 6: Verificación visual**

Arrancar la aplicación, capturar escritorio a las dimensiones de la referencia y móvil a 390×844. Inspeccionar con `view_image` la referencia aceptada y ambas capturas. Comparar copy, navegación, tipografía, paleta, densidad, tablas, estados y adaptación. Corregir cualquier desviación visible antes de continuar.

- [ ] **Step 7: Auditoría final del alcance**

Confirmar explícitamente: demo sin claves, fuentes y frescura, datos no disponibles, análisis reproducible, actualización, override, exportación, aviso responsable, value betting, arbitraje sin promesa y ausencia de análisis en vivo.

- [ ] **Step 8: Commit final**

```powershell
git add src README.md .env.example tests
git commit -m "feat: complete Analista Mundial Pro"
```

