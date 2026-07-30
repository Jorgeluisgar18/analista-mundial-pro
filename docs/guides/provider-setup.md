# Configuración de APIs reales

En desarrollo y pruebas, Analista Mundial Pro puede funcionar con fixtures locales sin claves ni consumo de cuota. Para consultar partidos reales de Mundial, ligas europeas y competiciones UEFA, configura proveedores externos.

## Comportamiento por entorno

- Desarrollo, test y CI usan fixtures aislados cuando corresponda; no llaman proveedores externos ni gastan cuota.
- Producción es *fail-closed*: no devuelve fixtures ni partidos demo. Si faltan persistencia o datos reales, la ruta informa indisponibilidad segura (`503`) en lugar de sustituirlos por datos de muestra.

## Variables de entorno

Copia `.env.example` como `.env` y completa solo las claves que tengas:

```env
DATABASE_URL=""
DIRECT_URL=""
FOOTBALL_API_KEY=""
FOOTBALL_DATA_API_KEY=""
FOOTBALLDATA_IO_API_KEY=""
FOOTBALLDATA_IO_BASE_URL="https://footballdata.io/api/v1"
THE_SPORTSDB_API_KEY=""
THE_SPORTSDB_BASE_URL="https://www.thesportsdb.com/api/v1/json"
THE_SPORTSDB_TIMEOUT_MS="8000"
ODDS_API_KEY=""
ODDS_API_BASE_URL="https://api.the-odds-api.com/v4"
ODDS_API_REGIONS="eu"
ODDS_API_MARKETS="h2h"
ODDS_API_BOOKMAKERS=""
ODDS_API_TIMEOUT_MS="8000"
```

`.env` está ignorado por Git. No subas claves reales al repositorio.

## Proveedores

| Proveedor | Variable | Uso |
| --- | --- | --- |
| Neon Postgres | `DATABASE_URL` | Persistencia durable para snapshots, cuotas, imports y overrides. |
| Netlify Database/Neon | `NETLIFY_DB_URL` | Fallback automático de runtime en Netlify cuando `DATABASE_URL` no está configurada. |
| API-FOOTBALL / API-Sports | `FOOTBALL_API_KEY` | Fixtures, ligas, equipos, detalles de partido y cobertura amplia. |
| Football-Data.org | `FOOTBALL_DATA_API_KEY` | Calendarios/resultados de ligas europeas top y competiciones UEFA. |
| Footballdata.io | `FOOTBALLDATA_IO_API_KEY` | Proveedor complementario independiente para fixtures, resultados, rankings FIFA y estadisticas. |
| TheSportsDB | `THE_SPORTSDB_API_KEY` | Enriquecimiento gratuito secundario para eventos, equipos, estadios, badges y contexto no crítico. |
| The Odds API | `ODDS_API_KEY`, `ODDS_API_REGIONS`, `ODDS_API_MARKETS` | Cuotas para value betting, comparación de mercados y surebets. Por defecto usa `eu+h2h` y solo consulta odds si `/events` encontró el partido. |
| Open-Meteo | No requiere clave | Clima estimado para sede/ciudad. |

## Prioridad de base de datos

En runtime, la app usa la primera opción disponible:

1. `DATABASE_URL`, cuando está configurada y apunta a Postgres.
2. `NETLIFY_DB_URL` de Netlify Database mediante `@netlify/database`.
3. Persistencia no-op solo para local/demo sin Postgres.

El modo no-op es defensivo y no debe considerarse producción: no guarda snapshots, uso de APIs, imports ni overrides.

## Comprobación

Después de configurar claves:

1. Reinicia `npm run dev`.
2. Abre `/api/provider-status`.
3. Revisa que el proveedor aparezca con `configured: true`.
4. Busca partidos en una fecha/liga con cobertura real.

## Plan gratuito y límites

La primera integración real usa API-FOOTBALL con el plan gratis. La app registra el consumo reportado por el proveedor y protege una reserva diaria: si el último registro indica que quedan muy pocas solicitudes, evita nuevas llamadas y usa únicamente datos reales cacheados cuando existan; en producción nunca los sustituye por demo. En desarrollo/test, los fixtures locales no consumen cuota.

The Odds API queda configurado con un flujo conservador para el plan gratis:

1. Primero consulta `/sports/{sport}/events`, que no consume cuota.
2. Compara equipos y kickoff contra el partido interno.
3. Solo si encuentra evento exacto llama `/sports/{sport}/events/{eventId}/odds`.
4. El costo de odds depende de mercados x regiones; el default `h2h` + `eu` busca gastar 1 crédito por evento con cuotas disponibles.
5. Si `/events` no encuentra partido, la app muestra una advertencia y no llama el endpoint pagado.

Recomendaciones prácticas:

- Evita refrescar muchas veces el mismo partido.
- Usa la búsqueda por fecha/liga antes de abrir varios partidos.
- Prioriza snapshots cacheados cuando estés cerca del límite diario.
- Agrega proveedores complementarios para repartir cobertura y no depender de una sola cuota.
- No confundas `FOOTBALL_DATA_API_KEY` con `FOOTBALLDATA_IO_API_KEY`: son proveedores diferentes, con dominios, headers y limites distintos.

## Reglas de seguridad

- No pegues claves reales en commits, issues ni documentación.
- No uses variables `NEXT_PUBLIC_*` para secretos.
- Rota la clave si accidentalmente se expone.
- En producción, configura las claves en el panel seguro del hosting.
