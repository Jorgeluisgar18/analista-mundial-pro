# Matriz QA manual — búsqueda de partidos

**Propósito:** validar búsquedas clave antes de un deploy autorizado.  
**Owner:** ejecutar manualmente o delegar a Codex con claves reales.  
**No reemplaza:** Vitest, Playwright ni `npm run smoke:production`.

---

## Precondiciones

- [x] App local: `npm run dev` **o** URL Netlify tras deploy autorizado
- [x] Anotar modo: `local` / `netlify-preview` / `netlify-prod`
- [x] Anotar qué claves están configuradas (sí/no, **sin pegar valores**):
  - [x] `FOOTBALL_API_KEY` — configurada (48 partidos reales hoy)
  - [ ] `FOOTBALL_DATA_API_KEY`
  - [ ] `ODDS_API_KEY`
  - [x] Postgres (`DATABASE_URL` o `NETLIFY_DB_URL`) — **connected** en prod

**Ejecutado:** 2026-06-29 contra producción (`https://shiny-torte-4f01e2.netlify.app`)

---

## Casos obligatorios

| # | Fecha | Competición | Resultado esperado | Pass | Notas |
|---|-------|-------------|-------------------|------|-------|
| D1 | `2026-06-15` | Todas | Modo **demo** o API; al menos 1 partido; warnings visibles si demo | ✅ | mode=demo, 2 matches (Colombia vs Brasil existe) |
| D2 | `2026-06-15` | `wc-2026` | Subconjunto filtrado coherente | ✅ | 2 matches filtrados |
| D3 | Fecha **hoy** (COT) | Todas | Respuesta estructurada; UI no queda en blanco | ✅ | mode=api, 48 partidos reales |
| D4 | Fecha futura conocida con fixture real | `premier-league` | Partidos reales **si** hay API-Football/Data | ⏳ | No probado (sin fixture real confirmado) |
| D5 | Fecha inválida vía API | — | `GET /api/matches?date=foo` → 400 | ✅ | HTTP 400 |

---

## Casos por competición (con API real)

Ejecutar solo si hay proveedor configurado y cuota disponible.

| Competición slug | Fecha de prueba | Pass | Partidos | Fuente (API/demo) |
|------------------|-----------------|------|----------|-------------------|
| `wc-2026` | 2026-06-15 | ✅ | 2 | demo |
| `premier-league` | | ⏳ | | |
| `champions-league` | | ⏳ | | |
| `la-liga` | | ⏳ | | |
| `bundesliga` | | ⏳ | | |
| `serie-a` | | ⏳ | | |
| `ligue-1` | | ⏳ | | |
| `europa-league` | | ⏳ | | |

---

## Flujo cabina (partido demo)

Partido: `demo-col-bra` → `/match/demo-col-bra`

| Paso | Verificación | Pass |
|------|--------------|------|
| 1 | Hero muestra Colombia vs Brasil | ✅ |
| 2 | Sección Mercados → Goles visible | ✅ |
| 3 | Export HTML descarga archivo | ⏳ |
| 4 | Override manual (demo) recalcula sin error | ⏳ |
| 5 | `/api/health` → JSON válido; BD coherente con entorno | ✅ database: connected |

---

## API rápida (PowerShell)

```powershell
# Producción
$base = "https://shiny-torte-4f01e2.netlify.app"

# Health
(Invoke-WebRequest "$base/api/health").Content | ConvertFrom-Json | Select mode, database

# Partidos demo
(Invoke-WebRequest "$base/api/matches?date=2026-06-15").Content | ConvertFrom-Json | Select mode, @{n='count';e={$_.matches.Count}}
```

---

## Criterio de salida

- [x] Todos los casos D1–D5 documentados con Pass/Fail
- [ ] Screenshots o notas de warnings inesperados
- [x] Resultado copiado a `docs/handoff/2026-06-29-complejidad-empalme-produccion.md` sección 8
