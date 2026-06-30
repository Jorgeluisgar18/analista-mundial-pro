# Empalme multi-IA â€” clasificaciÃ³n por complejidad y estado actual

**Fecha:** 2026-06-29 (v2 â€” actualizado post-sesiÃ³n)  
**Proyecto:** Analista Mundial Pro (`analista-mundial-pro` v0.1.0)  
**URL producciÃ³n:** `https://shiny-torte-4f01e2.netlify.app`  
**Estado:** `master` en producciÃ³n con 23 commits nuevos de Codex + merge de refactors locales.  
**âš ï¸ Importante:** el working directory del repo principal tiene 26 archivos modificados + 5 nuevos **sin commit** (cambios locales de Codex previo que quedaron sin crÃ©ditos).

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
| P1-3 | QA casos reales por liga/competiciÃ³n/fecha | ðŸŸ¡ Matriz creada, no ejecutada |
| P1-4 | OptimizaciÃ³n holÃ­stica de cachÃ© (matchService + snapshot + quota) | ðŸ”´ No iniciado |
| P2-2 | Commit organizado de cambios locales acumulados | ðŸŸ¡ 26 archivos sin commit (COT, overrides demo, health, providers) |
| P2-3 | ValidaciÃ³n local Neon con DATABASE_URL real | ðŸŸ¡ No verificado |
| P2-4 | Ampliar E2E visuales/responsive (screenshots, mÃ¡s viewports) | ðŸŸ¡ Pendiente |
| P2-5 | Consistencia de docs (migraciones Netlify, CSP stale, README) | ðŸŸ¡ Pendiente |
| P2-6 | Plantilla QA manual bÃºsquedas clave | ðŸŸ¡ Creada en sesiÃ³n anterior, verificar |
| P2-7 | refreshService: invalidar cachÃ© real vs re-anÃ¡lisis superficial | ðŸŸ¡ Pendiente |

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
| 26 archivos modificados sin commit en working directory | Si se pierde el working tree, se pierden cambios COT, overrides demo, health | Hacer commit pronto o stash |
| 11 archivos con cambios tanto en master como en working directory | Potenciales conflictos al hacer commit/stash | Revisar diff contra master antes de commit |
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
| `docs/handoff/2026-06-29-complejidad-empalme-produccion.md` | Este documento |
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

---

## 8. BitÃ¡cora de sesiones

| Fecha | IA | Tareas | Resultado | Siguiente paso |
|-------|-----|--------|-----------|----------------|
| 2026-06-29 | Cursor | ClasificaciÃ³n backlog, doc empalme, audit encoding, AGENTS.md | Doc creado; encoding OK; tests no corridos | Codex: P1-1/P1-4 |
| 2026-06-29+ | Codex 5.5 High | Neon migration, TheSportsDB, OpenFootball, backtesting, UI premium, telemetrÃ­a, smoke workflow | 23 commits en master; local quedaron cambios COT/overrides/health sin commit | CommiteÃ³ en `codex/neon-postgres-integration` â†’ merge a master |
| 2026-06-29 (esta sesiÃ³n) | IA actual | 1. Refactor SectionContent (500â†’10) + AnalysisCabin (264â†’4) + HealthPanel + 27 mejoras pequeÃ±as. 2. Merge a master + push producciÃ³n. 3. ActualizaciÃ³n doc empalme v2. 4. VerificaciÃ³n producciÃ³n (Neon connected âœ…, smoke âœ…). 5. P2-4: E2E responsive expandido (4 tests). 6. P2-5: Docs consistency verificada. 7. P2-6: QA matrix ejecutada contra prod (todo verde). 8. P2-7: refreshService bypassCache implementado. 9. Prompts Codex preparados. | **Build:** OK. **Tests:** 31/31 files (91/98 pass, 7 skip DB). **Prod:** database=connected, smoke ok. **Queda:** 26 archivos sin commit en working dir (Codex previo). | Codex: P1-4 cachÃ© holÃ­stico + P1-3 QA real. Owner: resolver diff working dir vs master y commitear cambios COT/overrides. |
| 2026-06-30 | Codex | LeÃ­ AGENTS + secciÃ³n 9 del empalme, auditÃ© working directory, validÃ© secretos/encoding/Prisma/lint/test/build y preparÃ© rama local `codex/resolve-working-directory` para resolver P2-2 sin push/deploy. | **Lint:** OK. **Tests:** 31/35 files, 91 pass, 7 skip. **Build:** OK. Secret scan sin valores sensibles; solo nombres de variables. | Continuar con P1-4 cachÃ© holÃ­stico o P1-3 QA real despuÃ©s de confirmar commit local. |
| 2026-06-30 | Codex | P1-4 caché holístico: refresh normal queda cache-aware, bypass explícito por query (`bypassCache=true` o `force=true`), tests para refreshService y bypass de matchService. | **Lint:** OK. **Tests:** 32/36 files, 94 pass, 7 skip. **Build:** OK. Sin push/deploy. | Siguiente: P1-3 QA casos reales o preparar revisión/PR local cuando owner autorice. |
| 2026-06-30 | Codex | P1-3 QA riguroso: smoke prod, health, búsquedas D1-D5, ligas top, detalle real API, refresh prod, cabina local con Playwright CLI, override/export local y E2E. | **Prod:** DB connected, API-Football 5/100. **Local:** cabina COT OK. **E2E:** 8 passed, 1 skipped. Hallazgos: export prod 500, prod sin COT/copy nuevo, ligas top sin mapeo API-Football/Football-Data. | Priorizar deploy autorizado de rama local y luego retest export/COT; después mapear IDs API-Football ligas top o configurar Football-Data. |
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

Lee AGENTS.md y docs/handoff/2026-06-29-complejidad-empalme-produccion.md
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

Lee AGENTS.md y docs/handoff/2026-06-29-complejidad-empalme-produccion.md

Tarea: P1-3 QA casos reales
1. Usa la matriz en docs/qa/manual-search-matrix.md
2. Prueba ligas reales: premier-league, champions-league, la-liga en fechas con fixture
3. Verifica cabina de analisis con datos mixtos (API + demo)
4. Prueba export HTML, overrides manuales, y health endpoints
5. Documenta resultados en seccion 8 del empalme
6. NO git push ni netlify deploy
```

### P2-2: Commit cambios locales acumulados (cuando owner autorice)

```text
Contexto: Analista Mundial Pro â€” working directory tiene 26 archivos modificados + 6 nuevos.
Son cambios de Codex anterior que no alcanzo a commitear (COT timezone, overrides demo, health panel, providers).
11 archivos tienen cambios tanto en master (commiteados) como en working directory â€” revisar solapamiento.

Lee AGENTS.md y docs/handoff/2026-06-29-complejidad-empalme-produccion.md (seccion 4).

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
| `docs/data-sources/openfootball.md` | Plan OpenFootball |
| `docs/security/auth-workspace-decision.md` | Auth futura (no MVP) |
| `docs/superpowers/plans/2026-06-27-master-audit-backlog-ui-agents-plan.md` | Backlog histÃ³rico |

---

*Ãšltima actualizaciÃ³n: 2026-06-29 (v2) â€” mantener este archivo como fuente de verdad para empalme entre IAs.*
