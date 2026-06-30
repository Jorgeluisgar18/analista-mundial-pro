# Matriz QA manual — búsqueda, cabina y producción

**Propósito:** validar búsquedas clave y flujos críticos antes de un deploy autorizado.  
**Owner:** ejecutar manualmente o delegar a Codex con claves reales.  
**No reemplaza:** Vitest, Playwright ni `npm run smoke:production`.

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
| `/api/health` | local | `mode=demo`, `database=unavailable` | ✅ | Correcto sin `DATABASE_URL` local |

---

## Casos obligatorios de búsqueda

| # | Fecha | Competición | Entorno | Resultado | Pass | Notas |
|---|-------|-------------|---------|-----------|------|-------|
| D1 | `2026-06-15` | Todas | prod | `200`, `mode=demo`, 2 partidos | ✅ | Producción aún muestra copy antiguo: `Datos demostrativos locales` |
| D2 | `2026-06-15` | `wc-2026` | prod | `200`, `mode=demo`, 2 partidos | ✅ | Subconjunto coherente |
| D3 | `2026-06-30` | Todas | prod | `200`, `mode=api`, 100 partidos | ✅ | Datos reales API-Football |
| D4a | `2026-08-15` | `premier-league` | prod | `200`, `mode=demo`, 0 partidos | ⚠️ | No hay Football-Data y el catálogo no tiene `apiFootballLeagueId` para Premier League |
| D4b | `2026-09-15` | `champions-league` | prod | `200`, `mode=demo`, 0 partidos | ⚠️ | Misma limitación de proveedor/mapeo |
| D4c | `2026-08-16` | `la-liga` | prod | `200`, `mode=demo`, 0 partidos | ⚠️ | Misma limitación de proveedor/mapeo |
| D5 | `foo` | — | prod | `400`, problem JSON | ✅ | Mensaje: `Usa el formato YYYY-MM-DD.` |

---

## API real — detalle y refresh

| Caso | Entorno | Resultado | Pass | Notas |
|------|---------|-----------|------|-------|
| Lista real hoy | prod | Primeros partidos reales disponibles | ✅ | Ejemplo: `Netherlands vs Morocco`, World Cup |
| `/api/match/1562345` | prod | `200`, dataset + analysis | ✅ | Alineaciones confirmadas API-Football |
| `/api/match/1562345/refresh` | prod | `200` | ✅ | En producción actual todavía fuerza proveedor; rama local ya lo hizo cache-aware |

---

## Cabina y flujos mutables

| Caso | Entorno | Resultado | Pass | Notas |
|------|---------|-----------|------|-------|
| Home visual | local | Carga sin errores de consola | ✅ | Solo warning esperado de DB local no configurada |
| Búsqueda demo | local | 2 partidos, horarios `COT`, etiquetas `Muestra local` | ✅ | UI no queda en blanco |
| Cabina demo | local | Hero, mercados y tabla visibles | ✅ | `Colombia vs Brasil`, `17:00 COT` |
| Refresh cabina | local | `POST /api/match/demo-col-bra/refresh` → `200` | ✅ | Sin errores de consola |
| Drawer mercado | local | Abre detalle `Más de 1.5 goles` | ✅ | Muestra trazabilidad y probabilidad |
| Override demo | local | `POST /api/match/demo-col-bra/overrides` → `201` | ✅ | Recalcula sin DB |
| Export demo | local | `/api/match/demo-col-bra/export` → `200` HTML | ✅ | Export funciona en rama local |
| Export demo | prod | `/api/match/demo-col-bra/export` → `500` | ❌ | Bloqueante en producción actual; local ya responde `200` |

---

## Playwright / E2E

| Comando | Resultado |
|---------|-----------|
| Playwright CLI local | Home, búsqueda, cabina, refresh y drawer inspeccionados |
| `npm run test:e2e` | 8 passed, 1 skipped |

---

## Hallazgos QA

| Severidad | Hallazgo | Estado recomendado |
|-----------|----------|--------------------|
| Alta | Producción falla export demo con HTTP 500 | Verificar tras deploy de rama local; local ya pasa |
| Alta | Producción aún sirve UTC/copy antiguo porque los commits locales no están desplegados | Requiere push/deploy autorizado |
| Media | Ligas top (`premier-league`, `champions-league`, `la-liga`) no devuelven fixtures reales con solo API-Football | Agregar `apiFootballLeagueId` por liga o configurar Football-Data |
| Media | Labels internos de fuentes demo siguen diciendo `demo/demostrativo` en drawer | Limpieza de copy premium pendiente |
| Baja | `Invoke-WebRequest` en PowerShell falló con `NullReferenceException`; `curl.exe` funcionó | Usar `curl.exe`/Node para QA automatizado en Windows |

---

## Criterio de salida

- [x] Smoke production ejecutado.
- [x] Búsquedas D1–D5 documentadas.
- [x] Casos liga top documentados con limitación real.
- [x] Cabina local validada con navegador.
- [x] Export y override validados localmente.
- [x] E2E local ejecutado.
- [x] Hallazgos copiados para priorización.
