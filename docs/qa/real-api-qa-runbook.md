# Runbook QA con APIs reales

Este runbook se usa cuando el owner autoriza una ronda de QA con proveedores reales. No reemplaza la matriz manual; la vuelve ejecutable y repetible.

## Reglas de cuota

- API-Football/API-Sports: maximo 50 llamadas en una ronda QA local.
- The Odds API: usar primero flujo `/events`; solo consumir odds cuando el evento fue encontrado.
- TheSportsDB: puede usarse con mayor libertad en plan gratuito, pero registrar errores/latencia.
- Football-Data.org y Footballdata.io: registrar si el proveedor devuelve calendario sin detalle o datos parciales.
- No ejecutar smoke productivo sin `SMOKE_BASE_URL` confirmado.

## Preparacion local

```powershell
npm run build
npm test
npm run test:e2e
npm run dev
```

Verifica en `/api/provider-status` que los proveedores esperados aparezcan configurados sin exponer secretos.

## Casos minimos

| Bloque | Entrada sugerida | Proveedor esperado | Validacion |
|---|---|---|---|
| Mundial/selecciones | Fecha FIFA/Mundial conocida, competicion `all` o Mundial | API-Football + TheSportsDB | Hora COT, banderas, vacio explicado si no hay calendario. |
| Premier League | Fecha de jornada EPL | Football-Data.org/API-Football/The Odds API | Lista o vacio explicado; no abrir odds si `/events` no encontro partido. |
| Champions League | Fecha de jornada UEFA | API-Football/The Odds API | Competicion correcta, proveedor y calidad visibles. |
| LaLiga | Fecha de jornada LaLiga | Football-Data.org/The Odds API | Logos/escudos si existen; mensajes claros si no hay detalle. |
| Fecha sin partidos | `2035-01-01` | Todos | Sin pantalla blanca; estado vacio y fuente explicada. |
| Alineacion esperada | Partido futuro a mas de 1 hora | API-Football/cache | Formacion esperada sin inventar nombres. |
| Alineacion oficial/parcial | Partido cercano con XI disponible | API-Football | Estado oficial/parcial visible y nombres preservados. |
| Cuotas no disponibles | Partido real sin mercado odds | The Odds API | Mercados no prometen value betting accionable. |
| Export HTML | Cabina con datos reales/parciales | App local | Incluye fuentes, calidad, cancha, odds y trazabilidad. |

## Evidencia a registrar

Usa esta tabla por cada ronda:

| Fecha QA | Entorno | Caso | Entrada | Proveedores consultados | Llamadas API-Football | Resultado | Hallazgos |
|---|---|---|---|---|---:|---|---|
|  | local |  |  |  |  | pendiente |  |

## Criterios de bloqueo

Deten la ronda y corrige antes de seguir si ocurre cualquiera de estos casos:

- pantalla en blanco;
- 404 cuando el problema real es proveedor caido/cuota;
- porcentajes identicos en partidos con contexto distinto;
- alineacion esperada con nombres inventados;
- cuotas/value betting sin fuente o sin cuota disponible;
- respuesta JSON/HTML con secretos;
- consumo de API-Football mayor al presupuesto acordado.

