# Empalme actual - Analista Mundial Pro

**Fecha:** 2026-07-30
**Rama:** `codex/production-readiness`
**Ultimo commit remoto verificado antes de esta limpieza:** `02c7a2f feat: expand export QA coverage`
**Produccion:** URL Netlify pendiente de confirmar. La URL historica `https://shiny-torte-4f01e2.netlify.app` respondio 404 en el ultimo smoke solo lectura. No certificar produccion hasta confirmar URL/deploy.
**Regla operativa:** no hacer deploy manual ni promover Netlify sin autorizacion explicita del owner.

## 1. Estado actual confiable

- Next.js 16 + React + TypeScript.
- Prisma + Neon/Postgres para persistencia durable cuando `DATABASE_URL` esta configurada.
- Flujo principal: home -> busqueda -> detalle/cabina -> refresh/overrides protegidos -> export HTML.
- Horario de aplicacion: Colombia (`America/Bogota` / COT).
- Proveedores implementados:
  - API-Football / API-Sports.
  - Football-Data.org.
  - Footballdata.io.
  - TheSportsDB.
  - The Odds API.
  - Open-Meteo.
  - OpenFootball como fuente historica/importable.
- Modelo:
  - Poisson + Dixon-Coles.
  - Monte Carlo.
  - Regresion logistica.
  - Elo historico.
  - Backtesting con Brier Score, Log Loss, RPS y `modelConfig` versionado desde corridas historicas.
- Export HTML incluye:
  - ruta de lectura;
  - alineaciones y disponibilidad;
  - cancha tactica simplificada;
  - jugadores clave;
  - contexto historico;
  - calidad por proveedor;
  - resumen de cuotas;
  - trazabilidad/calibracion.

## 2. Pendientes reales

| Prioridad | Pendiente | Nota |
|---|---|---|
| P0 operativo | Confirmar URL productiva activa y ejecutar smoke post-deploy | No desplegar sin autorizacion/creditos Netlify claros. |
| P1 configuracion | Configurar `FOOTBALL_DATA_API_KEY` en `.env.local`/Netlify si se desea cubrir Football-Data.org real | El provider existe, pero la ultima QA local no lo vio activo. |
| P1 tecnico | Continuar limpieza incremental de deuda y ampliar QA real por proveedor | La limpieza 2026-07-15 cerro los hallazgos P1/P2 mas accionables del barrido multiagente. |
| P2 docs | Mantener matrices QA separadas entre plantilla vigente e historicos | Evitar que otras IAs sigan resultados viejos como estado actual. |

## 3. Comandos de verificacion recomendados

```powershell
git status --short --branch
npx tsc --noEmit
npm run lint
npm test
npm run test:e2e
npm run build
git diff --check
```

Smoke de produccion solo cuando el owner confirme URL activa:

```powershell
$env:SMOKE_BASE_URL = "https://URL-ACTIVA-DE-NETLIFY"
npm run smoke:production
Remove-Item Env:\SMOKE_BASE_URL
```

## 4. Archivos de referencia

- Reglas del owner: `AGENTS.md`
- QA real mas reciente: `docs/qa/qa-real-providers-2026-07-14.md`
- Runbook QA APIs reales: `docs/qa/real-api-qa-runbook.md`
- Smoke produccion: `docs/qa/production-smoke.md`
- Setup proveedores: `docs/guides/provider-setup.md`
- Auditoria externa archivada: `docs/audits/informe-final-auditoria.md`
- Empalme antiguo archivado: `docs/archive/handoffs/handoff-pre-cleanup-2026-07-15.md`

## 8. Bitacora de sesiones

| Fecha | IA | Tareas | Resultado | Siguiente paso |
|---|---|---|---|---|
| 2026-07-30 | Codex | Tasks 1-5: política *fail-closed*, rutas/Health/UI, E2E/CI, contratos de cache/telemetría y documentación operativa. | Producción no usa fixtures demo; dev/test/CI usan fixtures locales sin cuota ni llamadas externas. Verificado: 36 tests focalizados, `npx tsc --noEmit`, `npx prisma validate`, lint, E2E normal y serial (11 passed/1 skipped en cada modo), cobertura 85.08% statements, build y `git diff --check`. Prisma CLI ahora prioriza `DIRECT_URL` para migraciones; `npx prisma migrate status` confirmó las 4 migraciones y esquema Neon al día. Deploy Netlify listo el 2026-07-30; smoke `GET /api/health` devolvió 200, `operational`, DB y telemetría conectadas, cuatro proveedores configurados. | Mantener QA real acotada por cuota y revisar despliegues futuros con el smoke documentado. |
| 2026-07-15 | Codex | Barrido baja/media prioridad: MarketDetailDrawer sin estilos inline propios, estilos del drawer consolidados en CSS, matching de equipos/proveedores endurecido contra tokens genericos, runbook QA con APIs reales agregado. | Verificado: focales del drawer/Odds/TheSportsDB OK, `npx vitest run --pool=threads --maxWorkers=4` 218 passed/9 skipped, `npm run test:e2e` 11 passed/1 skipped, `npm run build` OK, `npx tsc --noEmit` OK, `npm run lint` OK, `git diff --check` OK. Secret scan activo sin llaves reales. | Revisar diff y pedir autorizacion si se quiere commit/push. |
| 2026-07-15 | Codex | Segundo barrido multiagente: provider errors ya no se esconden como 404, rate limit persistente degrada a memoria si falla Postgres, overrides limita body real sin depender de `Content-Length`, surebets y rails moviles mejoran accesibilidad, Node alineado a 22, docs de produccion historica aclaradas, matriz QA con entradas sugeridas, test de encoding cubre docs/tests/scripts activos y CSS `.local-mode` huerfano eliminado. | Verificado: `npm test` 216 passed/9 skipped, `npm run test:e2e` 11 passed/1 skipped, `npm run build` OK, `npx tsc --noEmit` OK, `npm run lint` OK, `git diff --check` OK. Secret scan activo sin llaves reales. | Commit y push autorizados por owner al cierre de esta sesion. |
| 2026-07-15 | Codex | Auditoria multiagente read-only por dominios: frontend/UI, backend/API, proveedores/modelo/datos y docs/config/tests. Limpieza P1/P2 con TDD: slots visuales de alineaciones fuera de `starters`, una sola observacion de jugador cuando no hay datos individuales, contador de API usage monotonico, home con fecha Colombia actual, GET/export sin persistencia, historico best-effort, estado de providers consistente, Footballdata.io no confirma stats vacias, MarketTable con boton semantico, docs activas depuradas y smoke productivo exige URL explicita. | Verificado: `npm test` 211 passed/9 skipped, `npm run test:e2e` 11 passed/1 skipped, `npm run build` OK, `npx tsc --noEmit` OK, `npm run lint` OK, `git diff --check` OK. Secret scan activo y amplio sin llaves reales. | Si el owner autoriza, revisar diff final y hacer commit local. No hacer push/deploy sin autorizacion explicita. |
| 2026-07-14 | Codex | Cierre QA real/export: smoke local, busquedas por Mundial/Premier/Champions/LaLiga/fecha vacia, export HTML local y produccion solo lectura. | Commit `02c7a2f`. Local OK; produccion historica respondio 404, por tanto smoke productivo pendiente. | Confirmar URL activa/Netlify antes de certificar produccion. |
