# Empalme actual - Analista Mundial Pro

**Fecha:** 2026-07-30
**Rama:** `master` (verificada desde `codex/release-production`)
**Ultimo commit remoto verificado:** `dd53175 fix: preserve UTF-8 lineup availability labels`
**Produccion:** `https://analista-mundial-pro.netlify.app` activa; el deploy de `ec6ba7c` quedó `ready`.
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
| 2026-10-24 | Codex | Sincronización local de Git y QA post-rebase. | La rama `codex/personal-match-analysis-plan` quedó rebasada sobre `origin/master` (`a99cfc7`) sin conflictos; `master` local quedó actualizado por fast-forward. Verificación: `npm test` 244 passed/9 skipped; lint, TypeScript, build, E2E (11 passed/1 skipped) y `git diff --check` pasaron. La suite detectó una cadena con mojibake en un informe QA histórico; se corrigió el texto y tanto la prueba focalizada como la suite completa pasaron después. API/DB env vars vacías durante pruebas; no se consultaron proveedores reales, Neon ni producción. Inventario local de 12 worktrees: los otros 11 tienen tracked files limpios; `codex/release-production` va 1 commit y `codex/sdd-auth-foundation` 2 commits delante de `origin/master`; varios conservan untracked locales. No se modificaron esos worktrees. Sin push ni deploy. | PMA-02 sigue pendiente por conteo exacto de llamadas; PMA-03 requiere confirmar alcance antes de tocar normalización/fechas. No publicar sin autorización explícita.
| 2026-10-10 | Codex | PMA-02: QA local acotado con API para Premier, LaLiga, Champions y fecha vacia. | Premier 17 Oct devolvio 10 partidos bajo esa fecha, mientras el calendario oficial distribuye 5/4/1 entre 17–19 Oct; la consulta del 18 devolvio 0. LaLiga 18 Oct devolvio 4 de 10 emparejamientos oficiales; Champions 20 Oct devolvio los 9 partidos oficiales del martes. Se detecto encabezado de competicion vacio y ausencia de cuotas observadas en PSG–Barcelona (`Competicion` rechazado por The Odds API). DB desactivada para aislar la prueba (`Sin persistencia`), sin acceso a Neon; telemetry no persistida. API-Football real exacto no verificable: el caso global vacio pudo generar como maximo 1 solicitud + 1 reintento (`<=2`); detener llamadas reales hasta poder verificar el contador. El limite vigente es 20, y PMA-02 queda incompleto. | Revisar el alcance de PMA-03 antes de tocar normalizacion de proveedor/competicion o asignacion de fechas; no desplegar. |
| 2026-10-10 | Codex | PMA-01: limpieza de ejemplos caducados y métricas fijas de portada. | Se retiraron accesos rápidos del Mundial/Champions con fechas vencidas, se reemplazaron cifras de muestra por etiquetas descriptivas y se identificó el gráfico como ilustrativo. Vitest focalizado 6/6, ESLint, TypeScript, `git diff --check` y revisión visual local OK; sin llamadas reales a proveedores ni deploy. | Continuar con PMA-02: QA real acotado, máximo 20 solicitudes HTTP de API-Football contando reintentos. |
| 2026-10-10 | Codex | Replanteamiento del alcance de implementación para uso personal y pocos amigos. | Aprobado plan acotado en `docs/superpowers/plans/2026-10-10-personal-match-analysis.md`: limpieza de fechas/valores de portada, QA manual pequeña con APIs reales (máximo 20 llamadas API-Football), correcciones solo ante evidencia y regresión del flujo buscar → elegir → entender informe. Se excluyen funciones empresariales; implementación local y verificación real se reportan por separado. El plan amplio versionado permanece en `docs/superpowers/plans/2026-07-28-production-readiness.md`; el borrador ampliado local se preserva byte a byte en `docs/superpowers/plans/2026-07-28-production-readiness-expanded-draft.md`. No se certificó producción. | Empezar por PMA-01; mantener APIs reales fuera de pruebas automatizadas y no desplegar dentro de este alcance.
| 2026-07-30 | Codex | Salvaguarda visual para análisis con solo calendario. | Cuando no existen estadísticas base confirmadas, la cobertura del análisis baja a 35%; además, un empate como resultado modal ya no se describe erróneamente como partido parejo por la brecha frente a los equipos. Verificado: 32 pruebas de análisis/proveedor/UI, TypeScript, lint y `git diff --check`. | Publicar y repetir smoke de cabina Football-Data.org. |
| 2026-07-30 | Codex | Cabina navegable para calendarios Football-Data.org. | Se corrigió el flujo lista → detalle: un partido listado por Football-Data.org ya resuelve `/v4/matches/{id}` y crea una cabina con identidad confirmada, mientras alineaciones, cuotas, árbitro, clima y métricas quedan explícitamente no disponibles cuando esa fuente no las aporta. Verificado: 27 pruebas focalizadas, TypeScript, lint y `git diff --check`. | Publicar y comprobar `football-data--564634` en producción. |
| 2026-07-30 | Codex | Rotación de credencial Football-Data.org. | Se reemplazó `FOOTBALL_DATA_API_KEY` como secreto de producción sin registrar su valor. Las funciones activas seguían asociadas al entorno del deploy anterior; se requiere un nuevo build para cargar la credencial rotada antes de validar cobertura. | Push documental para disparar build, esperar deploy y repetir una consulta de Premier 2026. |
| 2026-07-30 | Codex | Diagnóstico seguro de cobertura Football-Data.org. | Se añade el motivo saneado que devuelve Football-Data.org a los avisos operativos, limitado y sin claves ni cabeceras. Esto permite diferenciar una temporada no cubierta de un error de integración. Verificado: 8 pruebas de proveedores, TypeScript, lint y `git diff --check`. | Publicar, consultar una fecha de Premier 2026 y decidir entre confirmar cobertura o incorporar fuente de calendario actual. |
| 2026-07-30 | Codex | Eliminación de bloqueo interno de ligas futuras y configuración de respaldo europeo. | API-Football ya no omite Premier, LaLiga o Champions solo por ser posteriores a 2024: cada consulta pasa por la protección central de cuota/caché y deja que el proveedor responda su cobertura real. Se configuró `FOOTBALL_DATA_API_KEY` como secreto de producción, sin exponer su valor. QA real detectó y corrigió un 400 propio de Football-Data.org: para una competición ahora se usa su subrecurso oficial `/v4/competitions/{código}/matches`, sin el filtro inválido `competitions`. Verificado: 12 pruebas focalizadas de proveedor/cuota/configuración, 8 pruebas de proveedor/uso, TypeScript, lint y compilación de build. | Publicar el ajuste y repetir una consulta de liga próxima; si los planes gratuitos no cubren 2026, conservar la explicación factual y repetir cuando haya fuente compatible. |
| 2026-07-30 | Codex | QA real ampliada y revisión visual de producción. | Premier (2026-08-15), LaLiga (2026-08-15) y Champions (2026-08-26) devolvieron HTTP 200 con vacío explicado: sin calendario publicado por los proveedores disponibles, sin pantalla blanca ni mezcla de competiciones. Mundial (2026-07-01) devolvió dos partidos reales con bandera y horario COT; la cabina mostró fuentes, cobertura y estados `unavailable` para XI de un partido finalizado, sin once inventado. The Odds API está configurada; para el encuentro terminado no existió mercado prepartido y se mostró como no disponible. Se corrigió la codificación de “Alineación no disponible para partido finalizado”. Verificado: 4 tests de alineaciones, TypeScript, lint, build y `git diff --check`. | Hacer commit y push autorizados por owner; Netlify debe ejecutar el deploy automático y luego repetir smoke mínimo. |
| 2026-07-30 | Codex | Correccion de los hallazgos QA y configuracion operativa de Netlify. | TDD: lista vacia real devuelve API 200 solo tras una respuesta exitosa; fallo total sigue como 503. Un partido finalizado sin XI se marca `unavailable` y no genera once esperado; un XI confirmado se preserva. Netlify: builds continuos reactivados y `ODDS_API_KEY` creada como secreto de produccion (sin exponer valor). Verificado: 24 tests focalizados, TypeScript, lint, build Next.js y `git diff --check`. La suite Vitest completa quedo bloqueada en este entorno aun en modo serial; se detuvo el proceso propio sin tocar procesos del usuario. | No hay push/deploy aun. Con autorizacion explicita: commit, push a master, esperar build y ejecutar una unica QA de cuotas. Repetir suite completa en CI/local estable antes de certificar cierre total. |
| 2026-07-30 | Codex | Diagnostico de auto-deploy Netlify y QA real controlada en produccion. | Netlify esta vinculado a GitHub/master, pero **Build status = Stopped**: causa verificada de que los pushes no disparen builds. Mundial y Champions devolvieron calendario real; Premier, LaLiga y fecha vacia respondieron 503. Evidencia en `docs/qa/qa-real-providers-2026-07-30.md`: vacio tratado como error, alineacion esperada para partido terminado y The Odds API sin configurar. API-Football termino en 7/100, bajo el tope acordado. | Reactivar builds solo con confirmacion del owner; corregir semantica de lista vacia, configurar `ODDS_API_KEY` en Netlify y repetir QA de cuotas. |
| 2026-07-30 | Codex | Tasks 1-5: política *fail-closed*, rutas/Health/UI, E2E/CI, contratos de cache/telemetría y documentación operativa. | Producción no usa fixtures demo; dev/test/CI usan fixtures locales sin cuota ni llamadas externas. Verificado: 36 tests focalizados, `npx tsc --noEmit`, `npx prisma validate`, lint, E2E normal y serial (11 passed/1 skipped en cada modo), cobertura 85.08% statements, build y `git diff --check`. Prisma CLI ahora prioriza `DIRECT_URL` para migraciones; `npx prisma migrate status` confirmó las 4 migraciones y esquema Neon al día. Deploy Netlify listo el 2026-07-30; smoke `GET /api/health` devolvió 200, `operational`, DB y telemetría conectadas, cuatro proveedores configurados. | Mantener QA real acotada por cuota y revisar despliegues futuros con el smoke documentado. |
| 2026-07-28 | Codex | Auditoria integral de estado, codigo, plan, base de datos, proveedores y QA. | Verificado en fresco: `master` limpio y sincronizado en `adaa23e`; `npx tsc --noEmit`, `npm run lint`, `npx prisma validate`, `npx prisma migrate status` y `npm run build` OK; Vitest 218 passed/9 skipped; cobertura 84.86% statements, 69.24% branches, 91.21% functions; E2E serial 11 passed/1 skipped. El E2E paralelo tuvo 1 fallo intermitente de navegacion y paso aislado/serial. Runtime local: API-ready, Neon conectado, telemetria conectada, Elo 100% sobre 1932 filas, backtesting listo con 817 muestras, rho Dixon-Coles -0.08, modelConfig persistido, 5 proveedores configurados; Football-Data.org sigue sin clave local. Produccion no certificada: URL historica respondio 404. | Priorizar triage de flakiness E2E paralelo, QA real de Football-Data y URL productiva confirmada; despues auth/workspace, calibracion periodica y comparacion de proveedores. |
| 2026-07-15 | Codex | Barrido baja/media prioridad: MarketDetailDrawer sin estilos inline propios, estilos del drawer consolidados en CSS, matching de equipos/proveedores endurecido contra tokens genericos, runbook QA con APIs reales agregado. | Verificado: focales del drawer/Odds/TheSportsDB OK, `npx vitest run --pool=threads --maxWorkers=4` 218 passed/9 skipped, `npm run test:e2e` 11 passed/1 skipped, `npm run build` OK, `npx tsc --noEmit` OK, `npm run lint` OK, `git diff --check` OK. Secret scan activo sin llaves reales. | Revisar diff y pedir autorizacion si se quiere commit/push. |
| 2026-07-15 | Codex | Segundo barrido multiagente: provider errors ya no se esconden como 404, rate limit persistente degrada a memoria si falla Postgres, overrides limita body real sin depender de `Content-Length`, surebets y rails moviles mejoran accesibilidad, Node alineado a 22, docs de produccion historica aclaradas, matriz QA con entradas sugeridas, test de encoding cubre docs/tests/scripts activos y CSS `.local-mode` huerfano eliminado. | Verificado: `npm test` 216 passed/9 skipped, `npm run test:e2e` 11 passed/1 skipped, `npm run build` OK, `npx tsc --noEmit` OK, `npm run lint` OK, `git diff --check` OK. Secret scan activo sin llaves reales. | Commit y push autorizados por owner al cierre de esta sesion. |
| 2026-07-15 | Codex | Auditoria multiagente read-only por dominios: frontend/UI, backend/API, proveedores/modelo/datos y docs/config/tests. Limpieza P1/P2 con TDD: slots visuales de alineaciones fuera de `starters`, una sola observacion de jugador cuando no hay datos individuales, contador de API usage monotonico, home con fecha Colombia actual, GET/export sin persistencia, historico best-effort, estado de providers consistente, Footballdata.io no confirma stats vacias, MarketTable con boton semantico, docs activas depuradas y smoke productivo exige URL explicita. | Verificado: `npm test` 211 passed/9 skipped, `npm run test:e2e` 11 passed/1 skipped, `npm run build` OK, `npx tsc --noEmit` OK, `npm run lint` OK, `git diff --check` OK. Secret scan activo y amplio sin llaves reales. | Si el owner autoriza, revisar diff final y hacer commit local. No hacer push/deploy sin autorizacion explicita. |
| 2026-07-14 | Codex | Cierre QA real/export: smoke local, busquedas por Mundial/Premier/Champions/LaLiga/fecha vacia, export HTML local y produccion solo lectura. | Commit `02c7a2f`. Local OK; produccion historica respondio 404, por tanto smoke productivo pendiente. | Confirmar URL activa/Netlify antes de certificar produccion. |
