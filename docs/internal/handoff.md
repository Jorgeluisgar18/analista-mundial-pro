# Empalme multi-IA â€” clasificaciÃ³n por complejidad y estado actual

**Fecha:** 2026-07-11 (v5 - actualizado post-calibracion historica)
**Proyecto:** Analista Mundial Pro (`analista-mundial-pro` v0.1.0)  
**URL producciÃ³n:** `https://shiny-torte-4f01e2.netlify.app`  
**Estado:** `master` actualizado en GitHub hasta `b88531b` (`feat: calibrate historical model health`). Netlify permanece sin deploy manual; si los builds siguen detenidos, el push no debe consumir creditos.
**Importante:** working directory limpio al retomar el 2026-07-11. No hay cambios locales acumulados pendientes.

---

## 1. Reglas del owner (obligatorias para todas las IAs)

| # | Regla | ImplicaciÃ³n prÃ¡ctica |
|---|-------|----------------------|
| 1 | **No subir a producciÃ³n sin autorizaciÃ³n** | No ejecutar `git push`, `netlify deploy --prod`, ni promover deploys. Solo preparar diff, docs y checklists. |
| 2 | **Clean code** | Diffs mÃ­nimos, nombres claros, sin abstracciones innecesarias, respetar convenciones existentes. |
| 3 | **No implementar extras no contemplados** | Si no estÃ¡ en el backlog acordado o en este doc, no se hace. Preguntar antes de ampliar alcance. |
| 4 | **Documentar todo** | Cada sesiÃ³n deja rastro: quÃ© se hizo, quÃ© no, comandos, resultados, bloqueos. |
| 5 | **Empalme entre IAs** | Leer este doc + `AGENTS.md` antes de tocar cÃ³digo. Actualizar la secciÃ³n 8 al cerrar sesiÃ³n. |

---

## 2. Panorama verificado (base comÃºn â€” actualizado)

### Completado / sÃ³lido

- Next.js 16 App Router + React 19 funcionando.
- Flujo UI: bÃºsqueda â†’ detalle â†’ cabina (10 secciones modulares) â†’ overrides â†’ export HTML.
- Horario **Colombia/COT** en bÃºsqueda y visualizaciÃ³n (`src/lib/time/colombia.ts`).
- API-Football integrada con **reserva de cuota gratuita** (`apiQuotaPolicy`, reserve=10).
- Football-Data como proveedor adicional en registry.
- **TheSportsDB** como proveedor secundario con cliente y normalizador registrados (âœ… P1-1 commiteado en master).
- **OpenFootball** como base de importaciÃ³n de datos estÃ¡ticos (âœ… P1-2 commiteado en master).
- **Backtesting** con mÃ©tricas de precisiÃ³n (âœ… commiteado en master).
- Open-Meteo para clima (sin API key).
- Prisma 7 + Postgres/Neon con **fallback noop** si no hay `DATABASE_URL`. 
- **Neon Postgres** migrado con migraciones Netlify Database (âœ… commiteado en master).
- Modo demo completo (`src/data/demo.ts`) cuando no hay cobertura real.
- Health panel + `/api/health` con estado honesto de BD, proveedores, uso y telemetrÃ­a.
- **Provider telemetry** con snapshots de uso (âœ… commiteado en master).
- **UI premium** â€” polish visual incremental (âœ… commiteado en master, P3-5).
- Suite Vitest: **31 files, 91 tests pass, 7 skipped** (DB-dependent). Build: 0 errores.
- CSP y headers de seguridad en `next.config.ts`.
- **Refactor SectionContent** (500â†’10 mÃ³dulos) y **AnalysisCabin** (264â†’4 archivos) â€” mergeado a master.
- **27 mejoras pequeÃ±as** (empty states, accesibilidad, copy educativo, defensivos runtime) â€” mergeado a master.
- **Production smoke workflow** (`npm run smoke:production`) â€” script en master.

### Pendiente (backlog actualizado)

| ID | Tarea | Estado |
|----|-------|--------|
| P0-2 | Verificar Neon/Netlify DB en producciÃ³n | ðŸ”´ No verificado aÃºn |
| P0-3 | Smoke test real post-deploy | ðŸ”´ No ejecutado aÃºn |
| P1-3 | QA casos reales por liga/competiciÃ³n/fecha | ðŸŸ¡ Matriz creada; siguiente QA debe ejecutarse local o post-deploy controlado |
| P1-4 | OptimizaciÃ³n holÃ­stica de cachÃ© (matchService + snapshot + quota) | ðŸŸ¡ Parcial: refresh cache-aware ya existe; pendiente revisar cuota/freshness holÃ­stico |
| P2-2 | Commit organizado de cambios locales acumulados | âœ… Cerrado: working tree limpio, `b88531b` pusheado a GitHub |
| P2-3 | Validación local Neon con DATABASE_URL real | ✅ Verificado localmente el 2026-07-02 |
| P2-4 | Ampliar E2E visuales/responsive (screenshots, mÃ¡s viewports) | ðŸŸ¡ Pendiente |
| P2-5 | Consistencia de docs (migraciones Netlify, CSP stale, README) | ðŸŸ¡ Pendiente |
| P2-6 | Plantilla QA manual bÃºsquedas clave | ðŸŸ¡ Creada en sesiÃ³n anterior, verificar |
| P2-7 | refreshService: invalidar cachÃ© real vs re-anÃ¡lisis superficial | âœ… Implementado: refresh normal cache-aware y bypass explÃ­cito |

### Ya completados por Codex (en master, 23 commits)

| ID | Tarea | Commit |
|----|-------|--------|
| P0-1 | Deploy a Netlify (merge a master + push) | âœ… Hecho en esta sesiÃ³n |
| P1-1 | TheSportsDB como proveedor real | `bcb5f2e` |
| P1-2 | OpenFootball/worldcup base | `3279423` |
| P1-3 | Backtesting metrics foundation | `b424bbc` |
| P3-1 | AuditorÃ­a encoding/mojibake | âœ… Sin hallazgos |
| P3-2 | AGENTS.md con reglas owner | âœ… Hecho |
| P3-3 | .env.example vs providerConfig | âœ… Coinciden |
| P3-4 | npm test + npm run build local | âœ… 31/35 files pass, build OK |
| P3-5 | UI premium incremental | `0940ea3` |

### Riesgos actuales

| Riesgo | Impacto | MitigaciÃ³n |
|--------|---------|------------|
| Estado documental desactualizado | Puede confundir a otras IAs sobre pendientes ya cerrados | Mantener secciÃ³n 8 y resumen superior actualizados |
| Netlify builds/creditos | Pushes pueden consumir creditos si los builds se reactivan | Confirmar Stopped builds antes de pushes frecuentes |
| Neon no verificado en producciÃ³n | Persistencia no funcional en prod | P0-2 pendiente |
| API-Football free tier | Quema de cuota | CachÃ© TTL + reserva diaria |

---

## 3. ClasificaciÃ³n por complejidad y delegaciÃ³n (actualizado)

**Leyenda:**
- ðŸ”´ **ALTO** â†’ Codex 5.5 High
- ðŸŸ¡ **MEDIO** â†’ IA estÃ¡ndar
- ðŸŸ¢ **BAJO** â†’ IA estÃ¡ndar

| ID | Tarea | Complejidad | IA | Dependencias | DoD |
|----|-------|-------------|-----|--------------|-----|
| P0-2 | **Verificar Neon/Netlify DB** en producciÃ³n | ðŸ”´ ALTO | Codex/Owner | Acceso panel Netlify/Neon | `/api/health` â†’ `database: connected` |
| P0-3 | **Smoke test real** post-deploy | ðŸ”´ ALTO | Codex/Owner | P0-2 | Script exit code 0 |
| P1-3 | **QA casos reales** por liga/fecha | ðŸ”´ ALTO | Codex + Owner | Claves API en Netlify | Informe QA con fechas probadas |
| P1-4 | **OptimizaciÃ³n cachÃ© holÃ­stica** | ðŸ”´ ALTO | Codex | TelemetrÃ­a en BD | Menos llamadas API-Football en refresh repetido |
| P2-2 | **Commit organizado** cambios locales | ðŸŸ¡ MEDIO | IA estÃ¡ndar | Owner aprueba | 1+ commits atÃ³micos; sin secretos |
| P2-3 | **ValidaciÃ³n local Neon** | ðŸŸ¡ MEDIO | IA/Owner | Cadena Neon | `migrate status` OK |
| P2-4 | **Ampliar E2E** visuales/responsive | ðŸŸ¡ MEDIO | IA estÃ¡ndar | Playwright OK | N specs nuevos sin flake |
| P2-5 | **Consistencia de docs** | ðŸŸ¡ MEDIO | IA estÃ¡ndar | â€” | Docs alineados con cÃ³digo |
| P2-6 | **QA manual** bÃºsquedas clave | ðŸŸ¡ MEDIO | IA estÃ¡ndar | â€” | Checklist ejecutable |
| P2-7 | **refreshService** invalidaciÃ³n cachÃ© | ðŸŸ¡ MEDIO | IA estÃ¡ndar | Entender matchSnapshotCache | Refresh fuerza datos stale |

### Orden recomendado de ejecuciÃ³n

```text
Fase A (YA â€” IA estÃ¡ndar, documentaciÃ³n + verificaciÃ³n):
  [x] P3-4 npm test + build [31 files, 91 pass, 7 skip]
  [ ] P0-3 smoke production
  [ ] P2-4 E2E responsive
  [ ] P2-5 docs consistency
  [ ] P2-6 QA matrix execution
  [ ] P2-7 refresh cache

Fase B (Codex, requiere juicio/arquitectura):
  P0-2 â†’ P1-4 â†’ P1-3

Fase C (solo con autorizaciÃ³n owner):
  P2-2 commit cambios locales â†’ P0-2 verify â†’ P0-3 smoke
```

---

## 4. Cambios locales acumulados (SIN COMMIT â€” urgentes)

El working directory del repo principal contiene 26 archivos modificados + 6 sin seguimiento. Son cambios de la sesiÃ³n de Codex que no alcanzÃ³ a commitear porque se le acabaron los crÃ©ditos.

### Archivos con seguimiento (modificados)

| Archivo | Cambio probable | Solapado con master? |
|---------|----------------|----------------------|
| `AGENTS.md` | Reglas owner + delegaciÃ³n | No en master |
| `README.md` | Enlace a doc empalme | SÃ­ â€” master tiene otra versiÃ³n |
| `src/app/api/health/route.ts` | TelemetrÃ­a + BD honesta | SÃ­ |
| `src/app/api/match/[id]/history/route.ts` | Ajustes historial | No |
| `src/app/api/match/[id]/overrides/route.ts` | Rama demo antes de Prisma | No |
| `src/components/analysis/MatchHero.tsx` | VisualizaciÃ³n fechas COT | No |
| `src/components/health/HealthPanel.tsx` | UI observabilidad | SÃ­ |
| `src/components/home/DateMatchFinder.tsx` | Copy/fechas COT | SÃ­ |
| `src/data/demo.ts` | Kickoffs COT + datos demo | No |
| `src/lib/analysis/analysisEngine.ts` | Ajustes motor | No |
| `src/lib/db/prisma.ts` | Runtime BD (noop + Neon) | SÃ­ |
| `src/lib/export/renderAnalysisHtml.ts` | Export con fechas COT | No |
| `src/lib/format/date.ts` | Delega a colombia.ts | No |
| `src/lib/providers/apiFootball.ts` | Ajustes proveedor | SÃ­ |
| `src/lib/providers/footballData.ts` | Ajustes proveedor | No |
| `src/lib/providers/providerConfig.ts` | Estado proveedores | SÃ­ |
| `src/lib/services/matchService.ts` | OrquestaciÃ³n/cachÃ© | No |
| `tests/e2e/core-flow.spec.ts` | Ajustes E2E | SÃ­ |
| `tests/integration/api-routes.test.ts` | Tests persistencia | SÃ­ |
| `tests/integration/match-service.test.ts` | Tests servicio | No |
| `tests/unit/analysis-cabin.test.tsx` | Ajuste test refactor | No |
| `tests/unit/api-football.test.ts` | Tests proveedor | SÃ­ |
| `tests/unit/competition-providers.test.ts` | Tests providers | SÃ­ |
| `tests/unit/date-match-finder.test.tsx` | Tests buscador | SÃ­ |
| `tests/unit/export-html.test.ts` | Tests export | No |
| `tests/unit/format-date.test.ts` | Tests formato | No |

### Archivos sin seguimiento (nuevos)

| Archivo | PropÃ³sito |
|---------|-----------|
| `docs/internal/handoff.md` | Este documento |
| `docs/qa/manual-search-matrix.md` | Matriz QA manual |
| `src/lib/overrides/demoOverrideService.ts` | Overrides sin BD en demo |
| `src/lib/time/colombia.ts` | Zona horaria Colombia |
| `tests/unit/colombia-time.test.ts` | Tests colombia.ts |
| `tests/unit/health-route.test.ts` | Tests health endpoint |

**âš ï¸ 11 archivos tienen cambios tanto en master (commiteados por Codex) como en working directory.**
Hay que resolver con `git diff master...HEAD` antes de commit para evitar regresiones.

---

## 5. Checklist pre-commit (para P2-2)

```powershell
# 1. Estado
git status
git diff --stat

# 2. Calidad
npm run lint
npm test
npm run build

# 3. Secretos (no debe devolver matches en src/)
git diff | Select-String -Pattern "api[_-]?key|password|secret|postgresql://" -CaseSensitive:$false

# 4. Encoding
git grep -n "Ãƒ|Ã‚|Ã¢â‚¬|Ã¯Â¿Â½" -- "*.ts" "*.tsx" "*.md" "*.css"

# 5. BD local (opcional)
npx prisma validate
npx prisma migrate status
```

**Criterio para commit:**
- [ ] Lint sin errores nuevos
- [ ] Tests verdes (al menos los no-DB)
- [ ] Build OK
- [ ] Sin secretos en diff
- [ ] Sin regresiones contra master (`git diff master...HEAD -- src/`)

**Propuesta de mensaje commit:**
```text
feat: horario Colombia, overrides demo y health panel de produccion

Normaliza fechas a America/Bogota, permite overrides en partidos demo sin BD
y consolida telemetria/estado de BD en /api/health.
```

---

## 6. Variables Netlify / Neon (referencia rÃ¡pida)

| Variable | Obligatoria prod | Notas |
|----------|------------------|-------|
| `DATABASE_URL` | SÃ­* | Postgres pooled Neon |
| `NETLIFY_DB_URL` | Auto | Fallback vÃ­a `@netlify/database` |
| `DIRECT_URL` | Opcional | Migraciones manuales |
| `FOOTBALL_API_KEY` | Recomendada | API-Football |
| `FOOTBALL_DATA_API_KEY` | Opcional | Ligas UEFA/Europa |
| `ODDS_API_KEY` | Opcional | Value/surebets |
| `THE_SPORTSDB_API_KEY` | Opcional | Cliente registrado en master (`bcb5f2e`) |
| `OPENAI_API_KEY` | No | Reservada; no usada |

**VerificaciÃ³n post-deploy:**
```powershell
$env:SMOKE_BASE_URL = "https://shiny-torte-4f01e2.netlify.app"
npm run smoke:production
Remove-Item Env:\SMOKE_BASE_URL
```

Detalle completo: `docs/deployment/netlify-neon-postgres.md`
Smoke: `docs/qa/production-smoke.md`

---

## 7. Hallazgos de auditorÃ­a (sesiones acumuladas)

| AuditorÃ­a | Resultado |
|-----------|-----------|
| Mojibake en `*.ts, *.tsx, *.md, *.css` | **Sin hallazgos** |
| TheSportsDB en runtime | **Registrado** en `createProviderRegistry` (master `bcb5f2e`) |
| TheSportsDB normalizer | Implementado con test (`tests/unit/theSportsDb.test.ts`) |
| OpenFootball en runtime | **Import foundation** en master (`3279423`) |
| Tests unitarios | **91 pass, 7 skip** (DB-dependent) |
| Tests integraciÃ³n DB | **7 skipped** â€” Prisma 7 ESM require() en vitest |
| Build producciÃ³n | **14 rutas, 0 errores** âœ… |
| Deploy producciÃ³n | **Realizado** (merge a master + push) âš ï¸ |
| Mundial 2026 — API-Football league ID | **Bug detectado:** `wc-2026` mapea a `apiFootballLeagueId: 1` que no tiene fixtures en API-Football. **Fix pendiente:** `fetchFixtures()` reintenta sin league ID cuando el filtro retorna 0. Archivos: `apiFootball.ts`, `competitionCatalog.ts`. Pendiente de deploy con prÃ³ximo lote. |
| Fallback API-Football y cuota gratis | **Hardening local:** fallback amplio acotado solo a `wc-2026`; ligas top no duplican llamadas cuando el league ID retorna 0. Test dedicado: `tests/unit/api-football-fallback.test.ts`. |

---

## 8. BitÃ¡cora de sesiones

| Fecha | IA | Tareas | Resultado | Siguiente paso |
|-------|-----|--------|-----------|----------------|
| 2026-07-14 | Codex | Bloques completados: limpieza/guardia de encoding en `src`; Plantillas/Alineaciones ahora usa campo táctico real con fuente y estado de XI esperado/oficial; Jugadores muestra equipo, titularidad humana y nota de confiabilidad por jugador; Contexto/Forma reciente incorpora histórico persistido, forma ponderada, ajuste por rival, porterías a cero y Elo; QA E2E valida flujo hacia Plantillas, Jugadores, Fuentes y export. También se retiró la lista duplicada bajo el campo para evitar repetir nombres y mejorar lectura visual. | **RED/GREEN:** `squads-section`, `players-section` y `context-section` fallaron primero por ausencia de campo/evidencia/contexto histórico y luego pasaron. **QA visual Browser:** `/match/demo-col-bra` carga sin overlay visible ni overflow; Plantillas muestra campo/fuente sin duplicar `Vargas`; Jugadores muestra `Titular esperado` y nota contextual. **Verificación final:** `npx tsc --noEmit` OK; `npm run lint` OK; `git diff --check` OK, solo warnings CRLF; `npm test` 57 pass/5 skipped, 200 pass/8 skipped; `npm run test:e2e` 11 pass/1 skipped; `npm run build` OK; secret scan sin hallazgos accionables. | Commit/push del bloque. Siguiente recomendado: QA real con proveedores/fechas concretas o ampliar export HTML con el nuevo contexto de alineaciones/jugadores. |
| 2026-07-14 | Codex | Cuatro bloques cerrados: (1) QA visual/export HTML descargado con ruta de lectura y evidencia visible; (2) evidencia por mercado más profunda en cabina y export (`fuentes`, cuota, edge, rango y lectura humana); (3) Health Panel con resumen operativo de proveedores, cuota diaria, cache, persistencia y telemetría; (4) QA full flow home → búsqueda → partido → fuentes/calidad → export. Se corrigieron dos bugs reales detectados por pruebas: `TeamVisual` ya no rompe si un proveedor omite `colors`, y warnings duplicados ya no generan keys repetidas en React. | **RED/GREEN:** tests nuevos fallaron primero por ausencia de evidencia/export/health y por `colors` indefinido; luego pasaron. **QA visual Browser:** home y cabina demo cargan sin pantalla en blanco, overlay ni overflow. **Verificación final:** `npx tsc --noEmit` OK; `npm run lint` OK; `git diff --check` OK, solo warnings CRLF; `npm test` 55 pass/5 skipped, 197 pass/8 skipped; `npm run test:e2e` 11 pass/1 skipped; `npm run build` OK; secret scan sin hallazgos accionables. | Commit/push del bloque. Siguiente recomendado: revisar copy/encoding heredado en E2E/docs o profundizar evidencia por jugador/alineaciones. |
| 2026-07-14 | Codex | UX móvil cabina: la barra de acciones inferior dejó de ser una franja invasiva y ahora funciona como dock flotante con mayor colchón inferior para que no tape contenido al final del informe. Se agregó regresión E2E para validar que la barra móvil no solape el último bloque visible. | **TDD/E2E:** `la barra móvil no tapa el contenido al final de la cabina` pasó en mobile Chromium. **Verificación:** `npx tsc --noEmit` OK; `npm run lint` OK; `git diff --check` OK; `npm test` 55 pass/5 skipped, 192 pass/8 skipped; `npm run test:e2e` 10 pass/1 skipped; `npm run build` OK. **Secret scan:** diff sin hallazgos; escaneo amplio sin hallazgos accionables, solo falsos positivos documentados (`package-lock.json` hashes y URL dummy en `prisma.config.ts`). | Commit/push del bloque. Siguiente recomendado: QA visual del export descargado o evidencia por mercado en cabina/export. |
| 2026-07-14 | Codex | Export HTML: el informe descargado ahora incluye `Trazabilidad del modelo` con versión usada y componentes Poisson + Dixon-Coles, Monte Carlo y Regresión logística para igualar la explicación disponible en cabina. | **TDD:** `export-html` falló primero por ausencia de trazabilidad y luego pasó. **Endpoint local:** `/api/match/demo-col-bra/export` contiene trazabilidad y componentes. **Verificación:** `npx tsc --noEmit` OK; `npm run lint` OK; `git diff --check` OK; `npm test` 55 pass/5 skipped, 192 pass/8 skipped; `npm run test:e2e` 9 pass/1 skipped; `npm run build` OK. | Commit/push del bloque. Siguiente recomendado: revisar UX de barra móvil/acciones o ampliar export con calidad de evidencia por mercado. |
| 2026-07-14 | Codex | Cabina/Fuentes: la subsección `Fuentes · Calidad` ahora muestra trazabilidad del modelo con versión usada y componentes del razonamiento: Poisson + Dixon-Coles, Monte Carlo y Regresión logística. Esto hace más claro de dónde salen los porcentajes y evita sensación de caja negra. | **TDD:** `sources-section` falló primero por falta de versión/componentes y luego pasó. **QA visual:** cabina demo en desktop/mobile con `Versión del modelo`, componentes visibles, sin console errors ni overflow. **Verificación:** `npx tsc --noEmit` OK; `npm run lint` OK; `git diff --check` OK; `npm test` 55 pass/5 skipped, 191 pass/8 skipped; `npm run test:e2e` 9 pass/1 skipped; `npm run build` OK. | Commit/push del bloque y seguir con QA/UX puntual de cabina o export HTML si se quiere igualar la trazabilidad fuera de la web. |
| 2026-07-14 | Codex | Mejora UX del Health Panel: el bloque de pesos calibrados dejó de verse como fila técnica y ahora muestra lectura humana (“Modelo listo para análisis”), fuente del último backtest persistido y pills separadas para Dixon-Coles, Monte Carlo y Logística. Ajuste responsive para mobile/tablet sin overflow. | **TDD:** prueba `health-panel` falló primero por falta de copy semántico y luego pasó. **QA visual:** desktop/mobile/tablet con copy y pesos visibles, sin console errors ni overflow. **Verificación:** `npx tsc --noEmit` OK; `npm run lint` OK; `git diff --check` OK; `npm test` 54 pass/5 skipped, 190 pass/8 skipped; `npm run test:e2e` 9 pass/1 skipped; `npm run build` OK. Sin commit, push ni deploy. | Siguiente recomendado: revisión de diff y commit local si owner autoriza; luego continuar con otra mejora UX puntual o QA de cabina. |
| 2026-07-14 | Codex | Health/modelConfig operativo: `/api/health` ahora expone `backtesting.modelConfig` parseado desde `CalibrationRun.config` y el Health Panel muestra etiqueta y pesos calibrados DC/MC/LOG. Se estabilizó el test de reserva API-Football usando una ventana futura, porque el fixture anterior venció el 2026-07-13 y permitía llamada legítima el 2026-07-14. QA milimétrica posterior corrigió type narrowing en backtesting y volvió determinista el E2E de abrir partido usando el link accesible real. Se ejecutó backtest local para persistir `modelConfig` real en Neon dev (`backtest-1.1.0-historical-817`) y se validó visualmente Health Panel/cabina en desktop, mobile y tablet. | **RED/GREEN:** pruebas focales fallaron primero por `modelConfig` ausente y UI sin “Pesos calibrados”; luego pasaron. **Verificación final:** `npx tsc --noEmit` OK; `npm run lint` OK; `git diff --check` OK; `npm test` 54 pass/5 skipped, 190 pass/8 skipped; `npm run test:e2e` 9 pass/1 skipped; `npm run build` OK; `npm run db:status` schema al día; focused secret scan 0 claves reales. **QA visual:** `/api/health` 200, `PESOS CALIBRADOS` visible, DC 67% / MC 18% / LOG 15%, cabina demo y mercado de goles visibles, sin console errors ni overflow en mobile/tablet. Sin commit, push ni deploy. | Siguiente recomendado: revisión final de diff y commit local solo si owner autoriza; después seguir con mejoras de UX/copy del Health Panel si se quiere aumentar legibilidad. |
| 2026-07-12 | Codex | Backtesting calibrado hacia modelo: se agregÃ³ `deriveModelConfigFromBacktest()` para producir pesos/logÃ­stica desde mÃ©tricas reales; `scripts/run-backtest.ts` persiste `modelConfig` en `CalibrationRun.config`; `historicalSignalService` lo lee y lo inyecta a `dataset.historical.calibration.modelConfig` para que `analysisEngine` use pesos versionados. | **RED/GREEN:** fallÃ³ primero por funciÃ³n ausente y por no leer `modelConfig`; luego pasÃ³. **Suite:** `npm test` 53 pass/5 skipped; 189 pass/8 skipped. **E2E:** 9 pass/1 skipped. **Lint:** OK. **Build:** OK. **Backtest compile:** `BACKTEST_DISABLE_DATABASE=1 npm run backtest` OK. | Hacer commit/push autorizado por owner. Siguiente futuro: correr backtest real con DB y monitorear health/modelVersion para confirmar configuraciÃ³n calibrada en datos reales. |
| 2026-07-12 | Codex | Bloque arquitectura/modelo: `listByDate` ahora enriquece partidos listados con snapshots persistentes frescos sin llamar `getMatch`; el motor 1X2 extrae pesos/logística a `ensembleConfig` con override por opciones o `historical.calibration.modelConfig`, normaliza pesos y deja etiqueta en `modelVersion`. | **RED/GREEN:** `match-service-list-cache` falló porque no consultaba cache; `ensemble` falló porque no había trazabilidad/config. Luego pasaron. **Suite:** `npm test` 53 pass/5 skipped; 187 pass/8 skipped. **E2E:** 9 pass/1 skipped. **Lint:** OK. **Build:** OK. No push/deploy. | Siguiente mejora natural: producir `modelConfig` desde backtesting real y persistirlo en DB/versionado de modelo, en vez de configurarlo manualmente. |
| 2026-07-12 | Codex | Corrección TDD de hallazgos reales del reporte nuevo: `apiQuotaDecision` ahora respeta `resetsAt`; la cabina muestra error operativo si falla `Actualizar datos`; export HTML incluye escenarios, alertas, surebets, calidad, calibración y valor esperado; `historicalFormFromMatches` expone splits local/visitante; `providerConfig` rechaza keys claramente inválidas sin romper TheSportsDB `123`. | **RED/GREEN verificado:** fallaron primero los tests focales y luego pasaron. **Suite:** `npm test` 52 pass/5 skipped; 184 pass/8 skipped. **E2E:** 9 pass/1 skipped. **Lint:** OK. **Build:** OK. No push/deploy. | Pendiente arquitectura pesada: cache/enriquecimiento de `listByDate` y calibración entrenada/parametrizable de pesos logistic/ensemble. |
| 2026-07-12 | Codex | Revisión crítica del nuevo reporte `docs/reports/estado-actual-proyecto-11-07-2026.md`: se contrastaron G1-G14 contra código actual, tests y health local para separar hallazgos reales de falsos positivos/desactualización. | **Base actual:** `npm test` 52 pass/5 skipped; 179 pass/8 skipped. `npm run test:e2e` 9 pass/1 skipped. `npm run lint` OK. `npm run build` OK. `/api/health` local: DB connected, providers principales configurados, Elo 100%, backtesting ready. Veredicto: reporte útil pero parcialmente desactualizado; no evidencia proyecto roto. | Priorizar hallazgos confirmados: export HTML incompleto, error UI en refresh, `apiQuotaDecision` sin `resetsAt`, calibración ML/pesos, validación formato de API keys y home/away histórico. |
| 2026-07-11 | Codex | Fix visual de banderas/escudos: `TeamVisual` ahora normaliza nombres reales de proveedor con sufijo `National Team` y reconoce selecciones en inglés/español, evitando fallback por siglas (`MNT`, `SAN`) cuando debe mostrarse bandera. | **RED/GREEN:** `team-visual` falló mostrando fallback y luego pasó con `flagcdn` MX/ZA. **Focal:** `team-visual`, `analysis-cabin`, `date-match-finder` OK (22 pass). HTML local de `/match/footballdata-io--204598` contiene `mx.png` y `za.png`; no contiene fallback `MNT`/`SAN`. | Verificación final, commit y push autorizado por owner para cerrar avance del día. |
| 2026-07-11 | Codex | QA visual local del estado de actualización antes de commit: cabina real `footballdata-io--204598` en desktop, clic en `Actualizar datos`, validación visual del bloque "Estado de actualización" con copy de cache/cuota. Revisión móvil: sin overflow ni overlay de error; el indicador dev de Next/Turbopack intercepta el botón inferior local, hallazgo solo de entorno dev. Secret scan previo sin claves reales. | **Browser local:** desktop OK, bloque `Cache inteligente` visible; mobile render OK sin overflow. **Suite completa:** `npm test` 51 pass, 5 skipped; 178 pass, 8 skipped. | Ejecutar build/lint finales, commit y push autorizado por owner. |
| 2026-07-11 | Codex | P1-4 mensajes operativos: la cabina ahora comunica el modo de actualización tras `Actualizar datos`: cache inteligente para proteger cuota o proveedor real cuando se fuerza consulta externa. Añadidas pruebas UI para ambos modos usando la respuesta real de `refreshService` (`refreshMode`, `refreshedFields`). | **Focal:** `analysis-cabin` 16 pass. Suite focal cache/refresh/health/copy/source ledger OK: 8 archivos pass, 1 skipped; 42 pass, 2 skipped. | Ejecutar `tsc`, lint y `git diff --check`; después QA visual ligera local si el owner quiere revisar en navegador. |
| 2026-07-11 | Codex | P1-4 cache/freshness: auditoría de `matchService`, `refreshService`, `cachePolicy` y cuotas. Detectado hueco thundering herd: dos requests simultáneos sin bypass podían duplicar `provider.getMatch`. Añadido candado in-memory por `matchId` para llamadas cache-aware; `bypassCache=true` conserva refresh forzado. | **Focal:** `tests/integration/match-service.test.ts` 14 pass. Nuevas pruebas cubren dedupe sin bypass y no-dedupe con bypass. | Ejecutar suite focal cache/refresh + lint/typecheck; luego decidir si se amplía a mensajes operativos de cache/cuota. |
| 2026-07-11 | Codex | QA local visual/API del Health Panel y cabina. Validado `/api/health` con DB conectada, Elo 100%, backtesting listo, rho -0.080. QA visual encontró y corrigió copy singular "hace 1 día", copy con tildes en Fuentes y warning React por keys duplicadas en `SourceLedger`. | **Focal:** `source-ledger`, `analysis-cabin`, `health-route`, `copy-encoding` OK (17 pass). Browser interno: home/health y cabina real Footballdata.io sin overlay; interacción Fuentes -> Calidad muestra Brier/Log Loss/RPS y rho; logs nuevos limpios. | Siguiente recomendado: bloque P1-4 cache/freshness holístico antes de reactivar deploys Netlify. |
| 2026-07-11 | Codex | Limpieza documental post-push: resumen superior, backlog, riesgos y estado de control de versiones actualizados para reflejar `b88531b` y working tree limpio. | Empalme deja de marcar falsos pendientes de "26 archivos sin commit" y "commit unico grande". | QA local visual/API del Health Panel y cabina para validar modelo historico, Elo, backtesting y rho. |
| 2026-07-09 | Codex | Bloque rho/health: calibrador Dixon-Coles por likelihood contra marcadores históricos, `run-backtest` guarda `dixonColesRho` en `CalibrationRun.config`, el motor usa rho calibrado en la matriz, `HealthPanel` y `/api/health` exponen frescura de Elo/backtesting/rho. | **Backtest local:** 817 muestras históricas, Brier 0.623, Log Loss 1.036, RPS 0.214, rho -0.080 aplicado con 817 marcadores. **Focal:** 38 pass. **Typecheck/lint inicial:** OK. | Ejecutar verificación completa final, secret scan, commit y push autorizado por owner. |
| 2026-07-09 | Codex | Backfill Elo ejecutado y H34/H66 completado: `historical:elo-backfill` optimizado por lotes, 966 partidos / 1.932 filas actualizadas; `modelStability` deja de ser literal y se calcula desde `CalibrationRun` (Brier, Log Loss, RPS y tamaño de muestra), expuesto en `dataQuality`. | Backfill OK. Focal: ensemble/confidence/analysis-cabin OK. | Verificación completa final y decidir commit/push. |
| 2026-07-09 | Codex | H29 Elo real: módulo puro `historical/elo`, conexión con `historicalSignalService`, escritura de `opponentElo`, enriquecimiento de `dataset.home/away.elo` desde histórico, copy público actualizado a Elo histórico y tests de sensibilidad. | Focal: historical-elo, historical-signal-service, analysis-engine, analysis-cabin OK. E2E core: 5 pass/1 skip. | Verificación completa final; siguiente bloque recomendado: H34/H66 `modelStability` real usando `CalibrationRun`. |
| 2026-07-09 | IA actual | QA profundo (15 bloques T41-T55) + revisión Codex de remediaciones OpenCode. Ajustes: rate limit sin confianza ciega en `X-Forwarded-For`, límite 413 para payloads grandes en overrides, backtest tolera JSON corrupto, persistencia con modo estricto opcional, pruebas concurrentes POST y edge 0-0. | Informe QA actualizado (`docs/qa/qa-report-2026-07-09.md`). Focal: rate-limit/API routes/analysis-engine/persistent-rate-limit OK. | Reproducir T46/T51 con ruta+método exactos; luego verificación completa antes de commit. |
| 2026-07-09 | IA actual | Cierre T46/T51: pruebas de auth/token sobre overrides (faltante, incorrecto, Bearer válido, token no configurado) y regresión User-Agent vacío/extenso contra `POST /api/match/[id]/analyze`. | **Focal:** `tests/integration/api-routes.test.ts` 16 pass/2 skip. **Typecheck:** OK. **Lint:** OK. T46/T51 no se reproducen como bug con rutas correctas. | Ejecutar verificación completa final si se va a commitear; no push/deploy sin autorización. |
| 2026-06-29 | Cursor | ClasificaciÃ³n backlog, doc empalme, audit encoding, AGENTS.md | Doc creado; encoding OK; tests no corridos | Codex: P1-1/P1-4 |
| 2026-06-29+ | Codex 5.5 High | Neon migration, TheSportsDB, OpenFootball, backtesting, UI premium, telemetrÃ­a, smoke workflow | 23 commits en master; local quedaron cambios COT/overrides/health sin commit | CommiteÃ³ en `codex/neon-postgres-integration` â†’ merge a master |
| 2026-06-29 (esta sesiÃ³n) | IA actual | 1. Refactor SectionContent (500â†’10) + AnalysisCabin (264â†’4) + HealthPanel + 27 mejoras pequeÃ±as. 2. Merge a master + push producciÃ³n. 3. ActualizaciÃ³n doc empalme v2. 4. VerificaciÃ³n producciÃ³n (Neon connected âœ…, smoke âœ…). 5. P2-4: E2E responsive expandido (4 tests). 6. P2-5: Docs consistency verificada. 7. P2-6: QA matrix ejecutada contra prod (todo verde). 8. P2-7: refreshService bypassCache implementado. 9. Prompts Codex preparados. | **Build:** OK. **Tests:** 31/31 files (91/98 pass, 7 skip DB). **Prod:** database=connected, smoke ok. **Queda:** 26 archivos sin commit en working dir (Codex previo). | Codex: P1-4 cachÃ© holÃ­stico + P1-3 QA real. Owner: resolver diff working dir vs master y commitear cambios COT/overrides. |
| 2026-06-30 | Codex | LeÃ­ AGENTS + secciÃ³n 9 del empalme, auditÃ© working directory, validÃ© secretos/encoding/Prisma/lint/test/build y preparÃ© rama local `codex/resolve-working-directory` para resolver P2-2 sin push/deploy. | **Lint:** OK. **Tests:** 31/35 files, 91 pass, 7 skip. **Build:** OK. Secret scan sin valores sensibles; solo nombres de variables. | Continuar con P1-4 cachÃ© holÃ­stico o P1-3 QA real despuÃ©s de confirmar commit local. |
| 2026-06-30 | Codex | P1-4 caché holístico: refresh normal queda cache-aware, bypass explícito por query (`bypassCache=true` o `force=true`), tests para refreshService y bypass de matchService. | **Lint:** OK. **Tests:** 32/36 files, 94 pass, 7 skip. **Build:** OK. Sin push/deploy. | Siguiente: P1-3 QA casos reales o preparar revisión/PR local cuando owner autorice. |
| 2026-06-30 | Codex | P1-3 QA riguroso: smoke prod, health, búsquedas D1-D5, ligas top, detalle real API, refresh prod, cabina local con Playwright CLI, override/export local y E2E. | **Prod:** DB connected, API-Football 5/100. **Local:** cabina COT OK. **E2E:** 8 passed, 1 skipped. Hallazgos: export prod 500, prod sin COT/copy nuevo, ligas top sin mapeo API-Football/Football-Data. | Priorizar deploy autorizado de rama local y luego retest export/COT; después mapear IDs API-Football ligas top o configurar Football-Data. |
| 2026-06-30 | Codex | Bloque ligas + UI premium: mapeo API-Football para Premier League, Champions, Europa League, LaLiga, Bundesliga, Serie A y Ligue 1; limpieza de copy visible `demo/demostrativo`; mejora de tokens tipográficos, contraste, superficies, botones, tablas, sidebar y footer desktop. | **Lint:** OK. **Tests:** 32/36 files, 94 pass, 7 skip. **Build:** OK. **E2E:** 8 passed, 1 skipped. Sin push/deploy. | Siguiente: QA real post-commit/deploy autorizado; validar ligas top en producción con API-Football y monitorear cuota gratis. |
| 2026-06-30 | Codex | Visual identity equipos/selecciones: nuevo `TeamVisual`, banderas reales para selecciones vía ISO/FlagCDN, escudos/logos desde API-Football (`logo`) y Football-Data (`crest`), CSP/Next Image configurado para dominios deportivos. | **Lint:** OK. **Tests:** 32/36 files, 94 pass, 7 skip. **Build:** OK. **E2E:** 8 passed, 1 skipped. Validado visualmente en lista y cabina local. Sin push/deploy. | Siguiente: al desplegar, validar que logos reales de API-Football/Football-Data carguen en producción bajo CSP de Netlify. |
| 2026-06-30 | IA actual | Diagnóstico y fix para Mundial 2026: `wc-2026` → league ID `1` retorna 0 fixtures en API-Football. Fix: fallback sin league ID + filtro por nombre "World Cup". Build+test OK. No deploy (owner acumula cambios). | **Build:** OK. **Tests:** 32/36 files, 94 pass, 7 skip. **Prod:** `/${api/matches}?competition=wc-2026` → 0 (código viejo). API-Football 16/100 usados. Fix en local pendiente de deploy. | Codex: incluir fix WC en próximo deploy autorizado (P2-2). |
| 2026-07-01 | Codex | Hardening OpenCode: limpiado ruido de `next-env.d.ts`, test TDD para fallback Mundial 2026 y protección de cuota, fallback sin league ID limitado a `wc-2026`, no a ligas top. | **Lint:** OK. **Tests:** 33/37 files, 96 pass, 7 skip. **Build:** OK. **E2E:** 8 passed, 1 skipped. Sin deploy. | Incluir en próximo lote autorizado; validar en producción que `wc-2026` retorne fixtures reales sin exceder cuota API-Football. |
| 2026-07-02 | Codex | QA funcional + auditoría navegación/UI: validación local de búsquedas demo/vacías/reales, análisis real API-Football, mobile, anchors, rutas críticas y guía de proveedores. Fixes: `/docs/provider-setup` dejó de redirigir y ahora es página real; mobile actionbar reordenada para que `Partidos` no quede bloqueado por overlay dev; E2E actualizado para flujo actual. | **No commit, no push, no deploy.** **Tests:** `npm test` 103 pass, 7 skip. **E2E:** 9 pass, 1 skip. **Lint:** OK. **Build:** OK. Secret scan sin claves reales; falsos positivos `sk-` eran `mask-image`/`risk-`. | **Pendiente por créditos Netlify:** hacer un solo commit grande cuando owner autorice. No desplegar hasta recuperar/confirmar créditos Netlify. |
| 2026-07-02 | Codex | Conexión Neon local: creado proyecto Neon para la app, configurado `.env.local` con `DATABASE_URL`/`DIRECT_URL`, Prisma CLI ahora carga `.env.local`, migraciones aplicadas y seed ejecutado. | **DB local:** connected. **`npm run db:status`:** up to date. **`/api/health`:** `database=connected`, `telemetryStatus=connected`. **Lint/build/tests focalizados:** OK. `.env.local` ignorado por Git. | Mantener secreto fuera del repo. En futuro commit incluir solo `prisma.config.ts` y `prisma/seed.ts`, no `.env.local`. |
| 2026-07-06 | Codex | Auditoría Claude aplicada por prioridad: H54 protegido `POST /api/match/[id]/overrides` con token de analista; H60 copy visible dejó de prometer Elo no implementado; H22/H75 API-Football ahora normaliza conteos reales de tiros, tiros a puerta, corners, tarjetas, faltas y offsides cuando el proveedor los entrega. | **Tests:** `npm test` 137 pass, 7 skip. **Focal:** `tests/unit/api-football.test.ts` cubre conteos distintos por equipo. **Typecheck:** OK. **Lint:** OK. **Build:** OK. Sin commit, push ni deploy. | Siguiente recomendado: resolver H09/H18/H34-H66 y limpiar copy/encoding de strings mojibake en proveedor/docs antes del próximo commit autorizado. |
| 2026-07-07 | Codex | Auditoría Claude bloque H09/H18/H34-H66: confianza ahora se limita si las estadísticas base son estimadas; Footballdata.io marca stats reales como confirmadas; rate limit persistente agregado con tabla `RateLimitBucket`; rutas `analyze`, `refresh` y `overrides` usan limitador persistente; overrides reales devuelven 503 si no hay DB configurada. | **Migración local Neon:** aplicada (`20260706010000_persistent_rate_limit`). **Tests:** `npm test` 139 pass, 7 skip. **Typecheck:** OK. **Lint:** OK. **Build:** OK. Sin commit, push ni deploy. | Siguiente recomendado: limpiar copy/encoding mojibake y evaluar H67 para mostrar en UI qué mercados usan datos reales vs estimados. |
| 2026-07-07 | Codex | Auditoría Claude H67: `MarketTable` ahora muestra columna de evidencia por mercado (`Confirmado`, `Estimado`, `Inferido`, `Conflicto`, `No disponible`) con estilos diferenciados y tooltip explicativo. | **Tests:** `npm test` 140 pass, 7 skip. **Focal:** `tests/unit/market-table.test.tsx`. **Typecheck:** OK. **Lint:** OK. **Build:** OK. Sin commit, push ni deploy. | Siguiente recomendado: limpiar copy/encoding mojibake y revisar H86 para que subsecciones restantes tengan contenido/flujo real, no solo títulos. |
| 2026-07-07 | Codex | Limpieza de copy/encoding visible: agregado test de regresión contra mojibake en `src`; corregido texto de rate limit persistente. Owner autorizó commit y push a GitHub. | **Focal:** `tests/unit/copy-encoding.test.ts` OK. Pendiente verificación completa antes del commit. | Siguiente: ejecutar checklist completo, commitear y hacer push sin deploy manual. |
| 2026-07-07 | Codex | H86 iniciado: subsecciones de `Resumen` y `Contexto` ahora renderizan contenido diferenciado en vez de reutilizar una vista genérica. `Resumen` separa Panorama/Probabilidades/Escenarios/Confianza; `Contexto` separa Necesidad/Forma reciente/Rivales/Motivación y presión. | **Focal:** `npx vitest run tests/unit/analysis-cabin.test.tsx` 12 pass. **Typecheck:** `npx tsc --noEmit` OK. **Lint:** OK. **Tests:** `npm test` 142 pass, 7 skip. **Build:** OK. Sin commit, push ni deploy. | Siguiente recomendado: continuar H86 con subsecciones restantes (`Táctica`, `Plantillas`, `Jugadores`, `Porteros`, `Valor y riesgo`, `Alertas`, `Fuentes`) y luego QA visual de navegación. |
| 2026-07-07 | Codex | H86 segundo lote: `Táctica`, `Porteros` y `Alertas` ahora tienen vistas por subsección. Táctica separa Formaciones/Plan ofensivo/Plan defensivo/Duelos/Ajustes 2T; Porteros separa Proyección/Paradas/Portería a cero/Riesgos; Alertas separa Prepartido/Alineaciones/Clima/Árbitro/Movimiento de cuotas con evidencia de dataset para clima y árbitro. | **Focal:** `npx vitest run tests/unit/analysis-cabin.test.tsx` 13 pass. **Typecheck:** `npx tsc --noEmit` OK. **Lint:** OK. **Tests:** `npm test` 143 pass, 7 skip. **Build:** OK. Sin commit, push ni deploy. | Siguiente recomendado: completar H86 con `Plantillas`, `Jugadores`, `Valor y riesgo` y `Fuentes`; después QA visual de navegación completa. |
| 2026-07-07 | Codex | H86 completado a nivel funcional: `Plantillas`, `Jugadores`, `Valor y riesgo` y `Fuentes` también renderizan contenido por subsección. Plantillas filtra lesionados/suspendidos/dudas/reemplazos y conserva alias `Disponibilidad`; Jugadores muestra métricas específicas por ranking; Valor diferencia `Solo observación`; Fuentes separa Evidencia/Calidad/Metodología. | **Focal:** `npx vitest run tests/unit/squads-section.test.tsx tests/unit/analysis-cabin.test.tsx` 16 pass. **Typecheck:** `npx tsc --noEmit` OK. **Lint:** OK. **Tests:** `npm test` 144 pass, 7 skip. **Build:** OK. Sin commit, push ni deploy. | Siguiente recomendado: QA visual local de navegación completa + revisar copy/encoding visible en `AnalysisCabin.tsx` antes del commit acumulado. |
| 2026-07-08 | Codex | Auditoría Claude post-`ef23d65` contrastada contra `1dae75c`: H86 ya está cerrado en local. Implementado H77 CI mínimo (`.github/workflows/ci.yml`) con Node 22, `npm ci`, lint, typecheck, tests y build. H34/H66 avanza: `freshness` deja de ser constante y se calcula desde `SourceRecord.observedAt`. H17 avanza: servicio `cleanupOldOperationalData` + script `npm run db:cleanup` para borrar `MatchSnapshot` viejos y `RateLimitBucket` expirados. | **CI local equivalente:** lint OK, `npx tsc --noEmit` OK, `npm test` 144 pass/7 skip, build OK antes del bloque H34/H17. **Focal nuevo:** `npx vitest run tests/unit/maintenance-cleanup.test.ts tests/unit/ensemble.test.ts` 3 pass. Limpieza DB no ejecutada para no borrar datos reales de Neon local. Sin push ni deploy. | Siguiente recomendado: verificación completa final (`lint`, `tsc`, `npm test`, `build`) y luego decidir si commit local. Después: H29 Elo real o H34 modelStability con `CalibrationRun`. |
| 2026-07-08 | Codex | Bloque medio/bajo: retries conservadores por proveedor con `resilientFetch`; ajuste de intensidades por bajas confirmadas/suspendidos; sensitivity tests para cuotas y disponibilidad; health panel con estados más claros; README saneado; guía `docs/data-sources/provider-onboarding.md`; reportes externos movidos a `docs/audits/`; matriz QA ampliada para próximo deploy. | **Focal:** `npx vitest run tests/unit/provider-http.test.ts tests/integration/analysis-engine.test.ts tests/unit/copy-encoding.test.ts` 21 pass. **Typecheck:** OK. **Lint:** OK. **Tests:** `npm test` 152 pass, 7 skip. **Build:** OK. Secret scan sin claves reales conocidas; solo URL local Postgres de desarrollo y patrón de checklist. Sin commit, push ni deploy. | Siguiente recomendado: revisar diff, decidir commit local. Luego QA visual con navegador si se quiere validar HealthPanel/cabina responsive antes de subir. |
| 2026-07-08 | Codex | QA visual local de Health Panel y cabina en escritorio/móvil. La primera ejecución E2E reveló 404 en rutas dinámicas por caché `.next` inconsistente; se limpió el artefacto generado y las rutas volvieron a responder 200. Detectado y corregido un bug real: el snapshot de cuota mostraba períodos vencidos; ahora conserva únicamente el período vigente más reciente por proveedor sin borrar el histórico de Neon. | **E2E:** 9 pass, 1 skip. **Visual:** home/health/cabina/mercado/móvil 200, sin errores de consola ni desborde horizontal. **Focal cuota:** 18 pass. Capturas guardadas fuera del repo. Owner autorizó commit y push a GitHub; sin deploy manual de Netlify. | Ejecutar verificación completa, secret scan, commit y push. |

### Estado de control de versiones y deploy

Estado actualizado el 2026-07-11:

- El commit acumulado ya fue realizado y pusheado a GitHub: `b88531b feat: calibrate historical model health`.
- Working directory limpio al retomar.
- No se ejecutó deploy manual de Netlify.
- Antes de cualquier nuevo commit/push, confirmar autorización del owner y repetir verificación mínima:
  1. `git status --short`
  2. secret scan sobre claves reales conocidas del entorno local, sin documentar prefijos ni valores en el repositorio.
  3. `npm test`
  4. `npm run test:e2e`
  5. `npm run lint`
  6. `npm run build`
- Deploy sugerido: solo después de que el owner confirme créditos Netlify disponibles o una ventana controlada de deploy.
---

## 9. Prompts para Codex 5.5 High (prÃ³xima sesiÃ³n)

### P1-4: OptimizaciÃ³n holÃ­stica de cachÃ© (prioridad)

```text
Contexto: Analista Mundial Pro.
- Produccion: https://shiny-torte-4f01e2.netlify.app (Neon connected, smoke OK)
- Master tiene: TheSportsDB, OpenFootball, Neon migration, telemetria, UI premium
- Working directory tiene 26 archivos sin commit (COT timezone, overrides demo, health panel)
- Branch codex/analista-mundial-pro esta 23 commits detras de master
- P2-7 ya implementado: refreshMatch ahora acepta bypassCache para forzar datos frescos

Lee AGENTS.md y docs/internal/handoff.md
Reglas: NO desplegar sin autorizacion. Clean code. Sin extras fuera del backlog.

Tarea: P1-4 Optimizacion holistica de cache
1. Lee matchService.ts, matchSnapshotCache.ts, cachePolicy.ts, apiQuotaPolicy.ts
2. El refreshService ya tiene bypassCache; aprovecha eso para:
   - Cache que evite llamadas repetidas a API-Football en refresh consecutivos SIN bypass
   - Cache que respete TTL por tipo de dato (cachePolicy.ts ya define los TTL)
   - Priorizacion de cuota: si quedan < 10 llamadas, no refrescar datos no criticos
3. Tests: verifica que refresh repetido SIN bypassCache no duplica llamadas API
4. Actualiza seccion 8 del doc de empalme
5. NO git push ni netlify deploy
```

### P1-3: QA casos reales

```text
Contexto: Analista Mundial Pro â€” produccion activa con Neon y API-Football.
docs/qa/manual-search-matrix.md tiene matriz ejecutable con D1-D5 verificados contra prod.
Master tiene: API-Football, TheSportsDB, OpenFootball, Open-Meteo, Football-Data.

Lee AGENTS.md y docs/internal/handoff.md

Tarea: P1-3 QA casos reales
1. Usa la matriz en docs/qa/manual-search-matrix.md
2. Prueba ligas reales: premier-league, champions-league, la-liga en fechas con fixture
3. Verifica cabina de analisis con datos mixtos (API + demo)
4. Prueba export HTML, overrides manuales, y health endpoints
5. Documenta resultados en seccion 8 del empalme
6. NO git push ni netlify deploy
```

### PX-1: Deploy acumulado (cuando owner autorice)

```text
Contexto: Analista Mundial Pro â€” el owner acumula cambios para desplegar de una sola vez.
Incluye:
- Fix Mundial 2026: `apiFootball.ts` fetchFixtures() fallback sin league ID + `competitionCatalog.ts` (si aplica)
- P2-2: commit cambios locales acumulados (COT, overrides, health)
- P1-4: cachÃ© holÃ­stico, P1-3: QA real, UI premium, TeamVisual, etc. (todo ya en master)

Pasos:
1. Revisar que working directory estÃ© limpio o resolver P2-2 primero
2. Verificar que master tenga todos los cambios acumulados (Codex previos ya en master)
3. Hacer merge a master, push a Netlify
4. Validar producciÃ³n: smoke test, health, y wc-2026 retorna partidos reales
5. Monitorear API-Football quota despuÃ©s del deploy
Reglas: NO desplegar sin autorizaciÃ³n explÃ­cita del owner.
```

### P2-2: Commit cambios locales acumulados (cuando owner autorice)

```text
Contexto: Analista Mundial Pro â€” working directory tiene 26 archivos modificados + 6 nuevos.
Son cambios de Codex anterior que no alcanzo a commitear (COT timezone, overrides demo, health panel, providers).
11 archivos tienen cambios tanto en master (commiteados) como en working directory â€” revisar solapamiento.

Lee AGENTS.md y docs/internal/handoff.md (seccion 4).

Tarea: P2-2 Commit organizado
1. Compara working directory contra master: git diff master...HEAD -- src/
   Identifica cambios que ya estan en master (no commitear de nuevo) vs cambios nuevos
2. Stash los cambios que ya existen en master, commit solo los nuevos
3. Mensaje propuesto: "feat: horario Colombia, overrides demo y health panel de produccion"
4. NO git push ni netlify deploy sin autorizacion del owner
```

---

## 10. Referencias cruzadas

| Documento | Uso |
|-----------|-----|
| `README.md` | Setup, comandos, metodologÃ­a |
| `docs/deployment/netlify-neon-postgres.md` | Neon/Netlify |
| `docs/qa/production-smoke.md` | Smoke post-deploy |
| `docs/qa/manual-search-matrix.md` | Matriz QA manual |
| `docs/data-sources/thesportsdb.md` | Plan TheSportsDB |
| `docs/data-sources/odds-api.md` | IntegraciÃ³n The Odds API conservadora para plan gratis |
| `docs/data-sources/openfootball.md` | Plan OpenFootball |
| `docs/security/auth-workspace-decision.md` | Auth futura (no MVP) |
| `docs/archive/plans/superpowers/2026-06-27-master-audit-backlog-ui-agents-plan.md` | Backlog histÃ³rico |

---

*Ãšltima actualizaciÃ³n: 2026-07-01 (v4) â€” mantener este archivo como fuente de verdad para empalme entre IAs.*
