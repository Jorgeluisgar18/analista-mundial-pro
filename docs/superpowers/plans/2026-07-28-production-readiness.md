# Production Readiness Implementation Plan

**Goal:** Eliminar fixtures demo de produccion, estabilizar QA/CI y preparar la certificacion real sin consumir cuotas fuera de una ronda autorizada.

**Guardrails:** No `git push`, deploy Netlify ni smoke remoto sin autorizacion explicita. Unit, integration, E2E y CI no llaman proveedores reales. Registrar cada bloque en `docs/internal/handoff.md`.

## Arquitectura acordada

- Un modulo de politica de runtime decide si se permiten fixtures demo.
- En `NODE_ENV=production`, Neon no configurado o una consulta sin proveedor real producen un error seguro `503`; desarrollo/test mantienen fixtures aislados.
- Health es `200` cuando operativo o en modo `development-demo`, y `503` con estado `degraded` en produccion. Nunca expone mensajes crudos de DB, URL o claves.
- Las rutas de lectura, analisis, refresco, export e historial manejan la indisponibilidad de forma coherente; la pagina del partido muestra un estado operativo en vez de un fallo generico.

## Task 1 — Politica de produccion (TDD)

**Archivos:** crear `src/lib/runtime/productionPolicy.ts`, `tests/unit/production-policy.test.ts`.

- [x] RED: probar que `createRuntimePolicy({ NODE_ENV: "production" })` no permite demo y que `assertDemoAllowed()` lanza `DemoDataUnavailableInProductionError` con `status=503`.
- [x] GREEN: implementar la politica minima y un tipo compartido `ProductionDataUnavailableError` para fuentes/persistencia no disponibles, con un guard para rutas.
- [x] Ejecutar `npx vitest run tests/unit/production-policy.test.ts` y revisar el diff.

## Task 2 — Servicio, rutas y pagina fail-closed (TDD)

**Archivos:** `src/lib/services/matchService.ts`, rutas `matches`, `match/[id]`, `match/[id]/history`, `match/[id]/analyze`, `refresh`, `export`, `src/app/match/[id]/page.tsx`; tests de servicio/rutas/health.

- [x] RED: `listByDate` y `getById` no devuelven `demoMatches` en produccion si no hay resultados reales; dev/test conserva ese fallback.
- [x] Inyectar `runtimePolicy` sin romper los constructores de tests existentes. Bloquear el fallback demo tras cache/proveedores reales; mapear el error seguro a `problem(503, "Datos reales no disponibles", ...)`.
- [x] Exigir configuracion de persistencia real antes de analisis en produccion para evitar el cliente no-op silencioso. Los errores operativos se traducen sin filtrar detalles.
- [x] Health usa `operational`, `degraded` o `development-demo`, y responde 503 en produccion degradada.
- [x] La pagina de partido comunica indisponibilidad, no 500.
- [x] GREEN: correr los tests focalizados y luego los tests relacionados.

## Task 3 — E2E determinista y CI

**Archivos:** `tests/e2e/core-flow.spec.ts`, `.github/workflows/ci.yml`.

- [x] Sustituir clicks seguidos de `toHaveURL` por `Promise.all([page.waitForURL(...), click])` en ambos flujos, sin elevar timeouts.
- [x] Añadir `npx prisma validate` y `npm run test:e2e` tras typecheck en CI, verificando que Playwright usa fixtures locales.
- [x] Ejecutar E2E normal y serial.

## Task 4 — Cobertura de contratos operativos

**Archivos:** `tests/integration/match-snapshot-cache.test.ts`, `tests/integration/api-usage.test.ts`, `tests/unit/provider-registry.test.ts`, `tests/unit/health-route.test.ts`.

- [x] Añadir contratos de cache ante DB indisponible, snapshot fresco sin proveedor, uso API seguro ante error y registry vacío.
- [x] Medir cobertura sin reducir 84.86% de statements y corregir solo fallos demostrados (85.08% de statements).

## Task 5 — Documentacion, checklist y QA preparada

**Archivos:** `README.md`, `docs/guides/provider-setup.md`, `docs/qa/real-api-qa-runbook.md`, `docs/qa/production-smoke.md`, `docs/internal/handoff.md`, este plan.

- [x] Documentar que produccion no usa fixtures demo y que dev/test no gastan cuota.
- [x] Completar matriz factual: Mundial, Premier, Champions, LaLiga, fecha vacia, alineacion esperada/oficial, odds sin mercado y export; API-Football <=50 llamadas y sin resultados inventados.
- [ ] Smoke externo bloqueado: esperar URL activa confirmada y autorizacion expresa del owner.

## Verificacion final

```powershell
git diff --check
npx prisma validate
npx prisma migrate status
npx tsc --noEmit
npm run lint
npx vitest run --pool=threads --maxWorkers=4
npm run test:e2e
npx playwright test --workers=1
npm run build
```

## Criterios de cierre

- Produccion no retorna `demoMatches`, `demo-col-bra` ni usa persistencia no-op de forma silenciosa.
- Desarrollo/test/CI conservan fixtures sin llamadas externas.
- Health, rutas y pagina no exponen secretos ni URLs de conexion.
- CI valida Prisma y E2E; ambos modos E2E dejan de tener la carrera de navegacion.
- QA real y smoke externo quedan ejecutados o bloqueados con causa documentada.
