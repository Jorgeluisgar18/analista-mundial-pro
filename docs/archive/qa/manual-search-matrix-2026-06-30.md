# Matriz QA manual — búsqueda, cabina y producción

**Propósito:** validar búsquedas clave y flujos críticos antes de un deploy autorizado.  
**Owner:** ejecutar manualmente o delegar a Codex con claves reales.  
**No reemplaza:** Vitest, Playwright ni `npm run smoke:production`.

---

## Bloque QA recomendado antes del próximo deploy

| Área | Caso | Resultado esperado |
|------|------|--------------------|
| Búsqueda por liga | Premier League / Champions / LaLiga en fecha con calendario | Lista partidos reales o mensaje vacío explicado por proveedor/cuota |
| Búsqueda por selección | Mundial/selecciones en fecha FIFA conocida | Horario Colombia, equipos con bandera/escudo y fuente visible |
| Caso vacío | Fecha sin partidos | Mensaje claro, CTA de fuentes/API, sin pantalla blanca |
| Cabina | Abrir un partido real y uno local | Resumen, mercados, fuentes y alertas cambian según contexto |
| Cuotas | Partido con y sin The Odds API disponible | Indicar cuota disponible, no disponible o caché sin romper análisis |
| Alineaciones | Oficial, esperada y no disponible | Mostrar estado correcto y nombres cuando existan |
| Salud | `/api/health` | Proveedor configurado/no configurado, uso, telemetría y DB legibles |
| Responsive | Home, resultados y cabina mobile | Sin overlays bloqueando CTA principales |

---

## Ejecución 2026-06-30

| Campo | Resultado |
|-------|-----------|
| Producción | `https://shiny-torte-4f01e2.netlify.app` |
| Local | `http://localhost:3000` sobre rama `codex/resolve-working-directory` |
| API-Football prod | Configurada |
| Football-Data prod | No configurada |
| TheSportsDB prod | No configurada |
| Odds API prod | No configurada |
| Postgres/Neon prod | `connected` |
| API-Football cuota observada | pasó de 1/100 a 5/100 durante QA |

---

## Smoke / health

| Caso | Entorno | Resultado | Pass | Notas |
|------|---------|-----------|------|-------|
| Smoke production | prod | `ok: true`, `database: connected`, `matchCount: 2` | ✅ | `npm run smoke:production` con `SMOKE_BASE_URL` |
| `/api/health` | prod | `mode=api-ready`, `database=connected`, `databaseRecords=4/5` | ✅ | Telemetría conectada |
| `/api/health` | local | `mode=api-ready`, `database=connected` | ✅ | Neon local conectado vía `.env.local` |

---

## Casos obligatorios de búsqueda

| # | Fecha | Competición | Entorno | Resultado | Pass | Notas |
|---|-------|-------------|---------|-----------|------|-------|
| D1 | `2026-06-15` | Todas | prod | `200`, `mode=demo`, 2 partidos | ✅ | Producción aún muestra copy antiguo: `Datos demostrativos locales` |
| D2 | `2026-06-15` | `wc-2026` | prod | `200`, `mode=demo`, 2 partidos | ✅ | Subconjunto coherente |
| D3 | `2026-06-30` | Todas | prod | `200`, `mode=api`, 100 partidos | ✅ | Datos reales API-Football |
| D4a | `2026-08-15` | `premier-league` | prod | `200`, `mode=demo`, 0 partidos | ⚠️ | Requiere lote local pendiente o proveedor complementario |
| D4b | `2026-09-15` | `champions-league` | prod | `200`, `mode=demo`, 0 partidos | ⚠️ | Misma limitación de proveedor/mapeo |
| D4c | `2026-08-16` | `la-liga` | prod | `200`, `mode=demo`, 0 partidos | ⚠️ | Misma limitación de proveedor/mapeo |
| D5 | `foo` | — | prod | `400`, problem JSON | ✅ | Mensaje: `Usa el formato YYYY-MM-DD.` |

---

## API real — detalle y refresh

| Caso | Entorno | Resultado | Pass | Notas |
|------|---------|-----------|------|-------|
| Lista real hoy | prod | Primeros partidos reales disponibles | ✅ | Ejemplo: World Cup |
| `/api/match/1562345` | prod | `200`, dataset + analysis | ✅ | Alineaciones confirmadas API-Football |
| `/api/match/1562345/refresh` | prod | `200` | ✅ | Producción actual todavía fuerza proveedor; rama local ya lo hizo cache-aware |

---

## Cabina y flujos mutables

| Caso | Entorno | Resultado | Pass | Notas |
|------|---------|-----------|------|-------|
| Home visual | local | Carga sin errores de consola | ✅ | Solo warning esperado de DB local no configurada |
| Búsqueda demo | local | 2 partidos, horarios `COT`, etiquetas `Muestra local` | ✅ | UI no queda en blanco |
| Búsqueda vacía | local | Mensaje diagnóstico + CTA guía APIs | ✅ | No hay pantalla blanca |
| Búsqueda real Mundial | local | `2026-07-01`, `wc-2026`, `mode=api`, 3 partidos | ✅ | Dentro de ventana permitida por plan gratuito API-Football |
| Cabina demo | local | Hero, resumen, mercados y tabla visibles | ✅ | `Colombia vs Brasil`, `17:00 COT` |
| Cabina real | local | `/match/1567307`, análisis visible | ✅ | `England vs Congo DR` |
| Refresh cabina | local | `POST /api/match/demo-col-bra/refresh` → `200` | ✅ | Sin errores de consola |
| Drawer mercado | local | Abre detalle de mercado | ✅ | Muestra trazabilidad y probabilidad |
| Override demo | local | `POST /api/match/demo-col-bra/overrides` → `201` | ✅ | Recalcula sin DB |
| Export demo | local | `/api/match/demo-col-bra/export` → `200` HTML | ✅ | Export funciona en rama local |
| Export demo | prod | `/api/match/demo-col-bra/export` → `500` | ❌ | Bloqueante en producción actual; local ya responde `200` |

---

## Playwright / E2E

| Comando | Resultado |
|---------|-----------|
| Playwright CLI local 2026-06-30 | Home, búsqueda, cabina, refresh y drawer inspeccionados |
| `npm run test:e2e` 2026-06-30 | 8 passed, 1 skipped |
| QA navegación/UI local 2026-07-02 | Home, anchors, docs, búsqueda demo/vacía/real, análisis desktop/mobile y rutas críticas OK |
| `npm run test:e2e` 2026-07-02 | 9 passed, 1 skipped |

---

## Hallazgos QA

| Severidad | Hallazgo | Estado recomendado |
|-----------|----------|--------------------|
| Alta | Producción falla export demo con HTTP 500 | Verificar tras deploy del lote local; local ya pasa |
| Alta | Producción aún sirve UTC/copy antiguo porque los commits locales no están desplegados | Requiere push/deploy autorizado |
| Media | Fechas futuras fuera de ventana free API-Football pueden devolver 0 partidos | UI ya lo explica; complementar con Football-Data/TheSportsDB/OpenFootball |
| Media | Ligas top dependen de mapeo/proveedores complementarios | Incluir lote local pendiente y validar post-deploy |
| Baja | Warning Prisma local sin `DATABASE_URL` | Resuelto localmente el 2026-07-02; `.env.local` usa Neon y está ignorado por Git |
| Operativa | Netlify sin margen de créditos para seguir desplegando | Congelar deploy; preparar un solo commit grande cuando owner autorice y los créditos estén disponibles |

---

## Estado pendiente para commit/deploy

Actualizado el 2026-07-02:

- Cambios locales acumulados verificados, pero **sin commit** por decisión del owner.
- Estrategia acordada: **un solo commit grande más adelante**.
- **No hacer push ni deploy** mientras Netlify esté sin margen de créditos.
- Última verificación local conocida:
  - `npm test`: 103 passed, 7 skipped.
  - `npm run test:e2e`: 9 passed, 1 skipped.
  - `npm run lint`: OK.
  - `npm run build`: OK.
  - `npm run db:status`: schema Neon actualizado.
  - `/api/health`: `database=connected`, `telemetryStatus=connected`.
  - Secret scan: sin claves reales detectadas.

---

## Criterio de salida

- [x] Smoke production ejecutado.
- [x] Búsquedas D1–D5 documentadas.
- [x] Casos liga top documentados con limitación real.
- [x] Cabina local validada con navegador.
- [x] Export y override validados localmente.
- [x] E2E local ejecutado.
- [x] Hallazgos copiados para priorización.
- [x] Pendiente de commit/deploy documentado por límite de créditos Netlify.
