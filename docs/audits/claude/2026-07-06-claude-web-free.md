# Claude Web Free - Auditoría por paquetes

Este flujo está pensado para Claude Web en plan free, donde normalmente conviene evitar ZIPs, repos completos o conversaciones gigantes. La estrategia es pedir una auditoría por rondas usando contexto curado.

## Regla principal

No pegues secretos ni archivos `.env`.

Nunca compartas:

- `.env`
- `.env.local`
- claves API reales
- `DATABASE_URL`
- tokens de Netlify, Neon, GitHub o proveedores deportivos
- capturas donde se vean claves
- dumps de base de datos privados

## Cómo usar Claude Web Free

En vez de enviar todo el proyecto, usa esta secuencia:

1. Prompt base de auditoría.
2. Paquete 1: contexto, stack y estructura.
3. Paquete 2: arquitectura de datos/backend.
4. Paquete 3: motor estadístico/análisis.
5. Paquete 4: frontend/UI/UX.
6. Paquete 5: testing, QA, performance y costos.
7. Pide a Claude que consolide todo en un plan P0/P1/P2/P3.

Si Claude responde que necesita más código, no pegues todo. Dale solo los archivos relacionados con la pregunta.

---

## Mensaje inicial para Claude

Copia y pega esto primero:

```text
Quiero que actúes como arquitecto senior full-stack, QA senior, frontend senior UI/UX, data engineer, especialista en modelos probabilísticos deportivos y revisor de seguridad.

Estoy usando Claude Web en plan free, así que no puedo pasarte todo el repositorio de una vez. Te voy a entregar el proyecto por paquetes. Quiero que audites cada paquete, guardes memoria del contexto dentro de esta conversación y al final me entregues un plan priorizado de mejoras.

No quiero que escribas código todavía. Quiero diagnóstico, riesgos, oportunidades, deuda técnica, mejoras de arquitectura, UI/UX, backend, base de datos, pruebas, performance, costos y seguridad.

Formato final deseado:

1. Diagnóstico ejecutivo.
2. Fortalezas.
3. Hallazgos por severidad P0/P1/P2/P3.
4. Recomendaciones de arquitectura.
5. Recomendaciones de motor estadístico/probabilístico.
6. Recomendaciones frontend UI/UX.
7. Recomendaciones backend/datos/proveedores.
8. Recomendaciones de testing QA.
9. Recomendaciones de performance/costos.
10. Riesgos de seguridad.
11. Plan de implementación por fases.
12. Checklist verificable.

Reglas:

- No pidas secretos.
- No asumas que faltan cosas sin evidencia.
- Si necesitas más contexto, pide archivos concretos.
- Prioriza plan gratuito o bajo costo.
- No recomiendes reescribir todo salvo razón fuerte.
- No recomiendes scraping agresivo como base principal.
- Distingue bugs, deuda técnica y mejoras de producto.
- Sé crítico, pero pragmático.

Ahora te pasaré el Paquete 1.
```

---

## Paquete 1: contexto, stack y estructura

Copia y pega esto después del mensaje inicial:

```text
PAQUETE 1 - Contexto, stack y estructura

Producto:
Analista Mundial Pro es una aplicación web de análisis futbolístico. Nació orientada al Mundial 2026, pero debe extenderse a ligas europeas, Champions League y otros torneos.

Objetivo:
Crear una web gratuita o de bajo costo con experiencia premium, análisis profundo, probabilidades explicables, datos multi-proveedor, contexto histórico, odds, alineaciones, UI clara y QA riguroso.

Stack:
- Next.js 16.2.9
- React 19.2.4
- TypeScript
- Prisma 7.8.0
- Neon Postgres
- Netlify
- Vitest
- Playwright
- Zod
- pg
- @netlify/database
- @netlify/plugin-nextjs

Scripts:
- npm run dev
- npm run build
- npm run lint
- npm test
- npm run test:e2e
- npm run db:generate
- npm run db:migrate
- npm run db:deploy
- npm run db:status
- npm run db:seed

Estructura principal:
- src/app
- src/components
- src/data
- src/lib
- src/types
- prisma
- scripts
- tests/e2e
- tests/integration
- tests/unit
- docs

src/lib contiene:
- analysis
- backtesting
- cache
- db
- evidence
- export
- format
- historical
- http
- lineups
- models
- openfootball
- overrides
- providers
- services
- time
- validation

Componentes de análisis:
- AnalysisCabin.tsx
- AnalysisSection.tsx
- AnalysisSidebar.tsx
- AnalysisTopbar.tsx
- ConfidenceBadge.tsx
- EditorialReading.tsx
- FormationPitch.tsx
- MarketDetailDrawer.tsx
- MarketTable.tsx
- MatchHero.tsx
- MetricStrip.tsx
- MobileActionBar.tsx
- ProbabilitySummary.tsx
- SectionContent.tsx
- SourceLedger.tsx
- UpdatePanel.tsx
- sections/*

Proveedores integrados o previstos:
- API-Football
- TheSportsDB
- Football-Data
- Footballdata.io
- The Odds API
- OpenFootball/worldcup.json
- OpenFootball/football.json

Necesito que revises este contexto y me digas:
1. Qué riesgos arquitectónicos sospechas por esta estructura.
2. Qué áreas pedirías revisar primero.
3. Qué archivos concretos te gustaría ver en el Paquete 2.
```

---

## Paquete 2: backend, datos y proveedores

Cuando Claude pida más, entrega fragmentos de estos archivos, no necesariamente completos si son grandes:

```text
PAQUETE 2 - Backend, datos y proveedores

Archivos recomendados para copiar parcialmente:

1. prisma/schema.prisma
2. src/types/domain.ts
3. src/lib/providers/providerRegistry.ts
4. src/lib/providers/providerConfig.ts
5. src/lib/providers/apiFootball.ts
6. src/lib/providers/footballData.ts
7. src/lib/providers/footballdataIo.ts
8. src/lib/providers/theSportsDb.ts
9. src/lib/providers/oddsApi.ts
10. src/lib/providers/normalizeDataset.ts
11. src/lib/services/matchService.ts
12. src/lib/services/analysisService.ts
13. src/app/api/matches/route.ts
14. src/app/api/match/[id]/route.ts
15. src/app/api/match/[id]/refresh/route.ts
16. src/app/api/provider-status/route.ts
17. src/app/api/usage/route.ts

Preguntas para Claude:

- ¿La separación providers/services/API routes está bien planteada?
- ¿Dónde puede haber acoplamiento excesivo?
- ¿El modelo Prisma soporta histórico, proveedores, odds, cache, uso de APIs y calibración sin volverse rígido?
- ¿La normalización multi-proveedor parece mantenible?
- ¿Cómo mejorarías fallback/cache respetando planes gratuitos?
- ¿Qué riesgos ves para Netlify/Neon?
```

---

## Paquete 3: motor estadístico y análisis

Archivos recomendados:

```text
PAQUETE 3 - Motor estadístico/análisis

Archivos:

1. src/lib/analysis/analysisEngine.ts
2. src/lib/models/*
3. src/lib/historical/*
4. src/lib/backtesting/*
5. src/lib/services/historicalSignalService.ts
6. src/lib/lineups/expectedLineups.ts
7. tests/integration/analysis-engine.test.ts
8. tests/unit/historical-form.test.ts
9. tests/unit/backtesting-metrics.test.ts
10. tests/unit/backtesting-run.test.ts
11. tests/unit/expected-lineups.test.ts

Preguntas para Claude:

- ¿El análisis parece suficientemente contextual o demasiado genérico?
- ¿Dónde podrían repetirse probabilidades por mala variabilidad?
- ¿Cómo mejorar Poisson, forma reciente, fuerza del rival, odds y calibración?
- ¿Cómo debería explicarse al usuario el origen de cada porcentaje?
- ¿Qué tests faltan para evitar análisis repetitivos?
- ¿Cómo validarías Brier Score, Log Loss y RPS?
- ¿Cómo manejarías alineación confirmada, oficial parcial, esperada y no disponible?
```

---

## Paquete 4: frontend, UI y UX

Archivos recomendados:

```text
PAQUETE 4 - Frontend/UI/UX

Archivos:

1. src/app/page.tsx
2. src/app/globals.css
3. src/components/home/DateMatchFinder.tsx
4. src/components/analysis/AnalysisCabin.tsx
5. src/components/analysis/AnalysisSidebar.tsx
6. src/components/analysis/AnalysisTopbar.tsx
7. src/components/analysis/EditorialReading.tsx
8. src/components/analysis/FormationPitch.tsx
9. src/components/analysis/MarketDetailDrawer.tsx
10. src/components/analysis/ProbabilitySummary.tsx
11. src/components/analysis/SourceLedger.tsx
12. src/components/analysis/sections/*
13. tests/unit/analysis-cabin.test.tsx
14. tests/unit/date-match-finder.test.tsx
15. tests/e2e/core-flow.spec.ts
16. tests/e2e/responsive.spec.ts

Preguntas para Claude:

- ¿La UI comunica análisis premium o se siente genérica?
- ¿La navegación entre subsecciones tiene sentido?
- ¿Dónde falta jerarquía visual?
- ¿Los estados vacíos son claros?
- ¿El usuario entiende por qué un partido no trae datos?
- ¿La visualización de alineaciones/campo es suficientemente clara?
- ¿Qué mejoras harías sin romper el backend?
```

---

## Paquete 5: QA, performance, costos y seguridad

Archivos recomendados:

```text
PAQUETE 5 - QA/performance/costos/seguridad

Archivos:

1. playwright.config.ts
2. tests/e2e/*
3. tests/integration/*
4. tests/unit/*
5. src/lib/cache/*
6. src/lib/http/*
7. src/lib/validation/*
8. src/lib/providers/apiQuotaPolicy.ts
9. src/app/api/health/route.ts
10. src/app/api/usage/route.ts
11. docs/provider-setup.md
12. docs/qa/manual-search-matrix.md
13. docs/data-sources/*

Preguntas para Claude:

- ¿Qué pruebas faltan para producción?
- ¿Qué e2e son críticos?
- ¿Cómo evitar consumir cuotas API innecesarias?
- ¿Qué estrategia de cache recomiendas?
- ¿Qué riesgos de seguridad puede haber en endpoints?
- ¿Cómo proteger secretos y evitar abuso?
- ¿Cómo reducir costos en Netlify y Neon?
```

---

## Mensaje final para consolidar auditoría

Después de pasar los paquetes, copia esto:

```text
Ya tienes los paquetes principales del proyecto. Ahora consolida tu auditoría.

Entrégame:

1. Diagnóstico ejecutivo.
2. Fortalezas actuales.
3. Hallazgos P0/P1/P2/P3 con evidencia.
4. Plan de implementación por fases.
5. Lista de archivos que probablemente deben tocarse.
6. Pruebas necesarias por fase.
7. Riesgos de tocar cada área.
8. Qué NO debería hacer todavía.
9. Quick wins.
10. Recomendaciones senior para mantener este proyecto sano.

Recuerda:
- No inventes archivos que no viste.
- Si algo es hipótesis, márcalo como hipótesis.
- Prioriza bajo costo y planes gratuitos.
- Dame un plan que pueda pasar a Codex para implementación posterior.
```

## Cómo pasarme luego el resultado

Cuando Claude te entregue la auditoría final, pégamela completa o guárdala en:

```text
docs/audits/claude/2026-07-06-auditoria-recibida.md
```

Luego me puedes decir:

```text
Aquí está la auditoría de Claude. Valida cuáles hallazgos aplican realmente, descarta falsos positivos y crea un backlog implementable por lotes. No hagas commit/push/deploy.
```

