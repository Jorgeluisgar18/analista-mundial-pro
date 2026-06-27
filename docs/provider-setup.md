# Configuración de APIs reales

Analista Mundial Pro funciona en modo demo sin claves, pero para usar partidos reales de Mundial, ligas europeas y competiciones UEFA necesitas configurar proveedores externos.

## Variables de entorno

Copia `.env.example` como `.env` y completa solo las claves que tengas:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL=""
FOOTBALL_API_KEY=""
FOOTBALL_DATA_API_KEY=""
THE_SPORTSDB_API_KEY=""
THE_SPORTSDB_BASE_URL="https://www.thesportsdb.com/api/v1/json"
THE_SPORTSDB_TIMEOUT_MS="8000"
ODDS_API_KEY=""
```

`.env` está ignorado por Git. No subas claves reales al repositorio.

## Proveedores

| Proveedor | Variable | Uso |
| --- | --- | --- |
| Neon Postgres | `DATABASE_URL` | Persistencia durable para snapshots, cuotas, imports y overrides. |
| Netlify Database/Neon | `NETLIFY_DB_URL` | Fallback automático de runtime en Netlify cuando `DATABASE_URL` no está configurada. |
| API-FOOTBALL / API-Sports | `FOOTBALL_API_KEY` | Fixtures, ligas, equipos, detalles de partido y cobertura amplia. |
| Football-Data.org | `FOOTBALL_DATA_API_KEY` | Calendarios/resultados de ligas europeas top y competiciones UEFA. |
| TheSportsDB | `THE_SPORTSDB_API_KEY` | Enriquecimiento gratuito secundario para eventos, equipos, estadios, badges y contexto no crítico. |
| The Odds API | `ODDS_API_KEY` | Cuotas para value betting, comparación de mercados y surebets. |
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

La primera integración real usa API-FOOTBALL con el plan gratis. La app registra el consumo reportado por el proveedor y protege una reserva diaria: si el último registro indica que quedan muy pocas solicitudes, omite nuevas llamadas a API-FOOTBALL y vuelve a demo/cache con una advertencia visible.

Recomendaciones prácticas:

- Evita refrescar muchas veces el mismo partido.
- Usa la búsqueda por fecha/liga antes de abrir varios partidos.
- Prioriza snapshots cacheados cuando estés cerca del límite diario.
- Agrega proveedores complementarios para repartir cobertura y no depender de una sola cuota.

## Reglas de seguridad

- No pegues claves reales en commits, issues ni documentación.
- No uses variables `NEXT_PUBLIC_*` para secretos.
- Rota la clave si accidentalmente se expone.
- En producción, configura las claves en el panel seguro del hosting.
