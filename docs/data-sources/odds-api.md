# The Odds API

Fuente oficial: https://the-odds-api.com/liveapi/guides/v4/

## Objetivo en Analista Mundial Pro

The Odds API se usa para enriquecer el análisis con cuotas prepartido:

- value betting;
- comparación de precios entre casas;
- detección de arbitraje/surebets;
- contraste entre probabilidad del modelo y probabilidad implícita de mercado.

## Diseño para plan gratis

La integración evita consultar cuotas por liga completa. El flujo actual es:

1. Resolver `sport_key` desde la competición interna.
2. Consultar `/v4/sports/{sport}/events` para encontrar el evento exacto. Este endpoint no consume cuota.
3. Comparar equipos normalizados y kickoff.
4. Solo si hay evento compatible, consultar `/v4/sports/{sport}/events/{eventId}/odds`.
5. Registrar headers de cuota (`x-requests-used`, `x-requests-remaining`, `x-requests-last`) en telemetría de uso.

Defaults conservadores:

```env
ODDS_API_REGIONS="eu"
ODDS_API_MARKETS="h2h"
ODDS_API_TIMEOUT_MS="8000"
```

Con esos defaults, un evento con cuotas disponibles normalmente cuesta 1 crédito porque el costo depende de mercados x regiones. Para QA profunda se pueden ampliar mercados temporalmente, por ejemplo `h2h,totals`, sabiendo que sube el costo.

## Variables

| Variable | Default | Uso |
| --- | --- | --- |
| `ODDS_API_KEY` | vacío | Secreto del proveedor. Nunca va al cliente ni al repositorio. |
| `ODDS_API_BASE_URL` | `https://api.the-odds-api.com/v4` | Base URL oficial v4. |
| `ODDS_API_REGIONS` | `eu` | Región de bookmakers. Mantener una sola región en plan gratis. |
| `ODDS_API_MARKETS` | `h2h` | Mercado principal resultado 1X2/moneyline. |
| `ODDS_API_BOOKMAKERS` | vacío | Filtro opcional por casas específicas. |
| `ODDS_API_TIMEOUT_MS` | `8000` | Timeout defensivo de red. |

## Sport keys soportados inicialmente

- `soccer_epl`
- `soccer_uefa_champs_league`
- `soccer_uefa_europa_league`
- `soccer_spain_la_liga`
- `soccer_germany_bundesliga`
- `soccer_italy_serie_a`
- `soccer_france_ligue_one`
- `soccer_fifa_world_cup`

Si una competición no mapea a sport key, la app devuelve cuotas vacías con advertencia y no llama a endpoints pagados.

## Reglas de seguridad y cuota

- No usar `NEXT_PUBLIC_ODDS_API_KEY`.
- No pedir `/odds` por liga completa desde UI.
- No ampliar `ODDS_API_MARKETS` en producción sin revisar presupuesto.
- Si `/events` no encuentra partido, no se llama `/events/{eventId}/odds`.
- Los errores 401/403/429 se reportan como fuente no disponible y no deben romper el análisis completo.
