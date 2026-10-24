# Matriz QA manual vigente

Esta matriz define casos de uso que deben probarse antes de certificar una versión local o un deploy. Los resultados históricos viven en `docs/archive/qa/`.

## Reglas

- Usar horario Colombia para interpretar fechas.
- No asumir que una fecha sin partidos es bug: verificar mensaje, fuente y proveedor.
- No consumir cuota de API-Football sin necesidad; preferir pocos casos representativos.
- No hacer deploy ni smoke productivo sin autorización del owner.

## Casos obligatorios

Las entradas sugeridas son puntos de partida; si una API cambia calendario/cobertura, registra el resultado real y el mensaje mostrado por la app.

| Area | Caso | Entrada sugerida | Resultado esperado |
|---|---|---|---|
| Busqueda por seleccion | Mundial/selecciones en fecha conocida | `2026-06-15`, competicion Mundial/selecciones o `all` | Lista real o vacio explicado; banderas visibles; hora COT. |
| Busqueda por liga | Premier League | Fecha de temporada activa + Premier League | Lista real o vacio explicado por proveedor/cuota/calendario. |
| Busqueda UEFA | Champions League | Fecha de jornada UEFA + Champions League | Lista real o vacio explicado. |
| Busqueda LaLiga | LaLiga | Fecha de temporada activa + LaLiga | Lista real o vacio explicado. |
| Fecha sin partidos | Fecha futura/lejana sin calendario | `2035-01-01`, `all` | Estado vacio claro, sin pantalla blanca. |
| Partido con datos parciales | Abrir cabina desde resultado parcial | Cualquier partido real con fuentes incompletas | Fuentes y calidad dejan claro que es confirmado/estimado/inferido. |
| Cuotas no disponibles | Partido sin odds | Partido real sin mercado The Odds API | Mercados no prometen valor accionable sin cuota. |
| Alineacion esperada | Partido sin XI oficial | Partido futuro a mas de 1 hora | Muestra formacion esperada sin inventar nombres de jugadores. |
| Alineacion oficial/parcial | Partido con XI confirmado o parcial | Partido cercano/en vivo historico con XI disponible | Estado oficial/parcial visible y nombres preservados. |
| Export HTML | Descargar informe | Cabina de cualquier partido QA | Incluye cancha, disponibilidad, fuentes, cuotas y trazabilidad. |
| Health | `/api/health` | Local y, si procede, URL productiva confirmada | DB, telemetria, proveedores, cuota y backtesting legibles. |
| Responsive | Home + cabina en movil/tablet | 390px, 768px y 1440px | Sin overflow ni botones tapados. |

## Plantilla de ejecución

| Fecha QA | Entorno | Caso | Entrada | Resultado | Estado | Notas |
|---|---|---|---|---|---|---|
|  | local/prod |  |  |  | pendiente |  |

## Ejecucion local — 2026-10-10

Todas las horas se interpretan en Colombia (COT). La base de datos se desactivo intencionalmente para aislar la prueba; `/api/health` indico `Sin persistencia`, por lo que el uso de proveedores no quedo persistido y el conteo exacto de solicitudes no se puede verificar. No se accedio a Neon.

| Caso | Entrada | Resultado observado | Estado |
|---|---|---|---|
| Premier League — fecha 17 | `2026-10-17`, Premier League | La app devolvio 10 partidos respaldados por API y los presento bajo el 17 de octubre; varios con hora 14:00 COT. El calendario oficial ubica 5 partidos el 17, 4 el 18 y 1 el 19. Se abrio Leeds United–Manchester United y el informe tambien lo mostro el 17, aunque el calendario oficial lo ubica el 18. Discrepancia de fecha/asignacion confirmada; no corregida en esta tarea documental. | Hallazgo prioritario |
| Premier League — fecha 18 | `2026-10-18`, Premier League | 0 partidos reales y estado local claro de vacio/sin cobertura. Contrasta con los 4 partidos oficiales de esa fecha y con la discrepancia observada en la busqueda del dia 17. | Hallazgo prioritario |
| LaLiga | `2026-10-18`, LaLiga | 4 partidos respaldados por API; pertenecen a la jornada oficial del 18, que contiene 10 emparejamientos en total. | Cobertura parcial |
| Champions League | `2026-10-20`, Champions League | 9 partidos respaldados por API, coincidentes con los 9 encuentros oficiales del martes. | Correcto para la fecha probada |
| Champions League — cuotas e informe | PSG–Barcelona, `footballdata-io--3714523128` | El informe cargo, pero el encabezado no mostro la competicion. La fuente indico que The Odds API rechazo `Competicion` como competicion no soportada. El mercado mostro probabilidades del modelo, pero ninguna cuota/referencia disponible; no se observaron cuotas. | Hallazgo de mapeo/cobertura; no corregido |
| Partido con datos parciales | Leeds United–Manchester United, `footballdata-io--967011635` | El XI esperado mostro formacion, sin nombres de jugadores. Lesiones y suspensiones indicaron que no habia reporte confirmado; esto no significa que se haya confirmado la ausencia de bajas. La fecha se mostro como 17 de octubre y no coincide con el calendario oficial del 18. | Hallazgo de fecha; estados de disponibilidad comunicados sin afirmar ausencias |
| Fecha sin partidos — global | `2035-01-01`, `all` | 0 resultados, con estado local de vacio/sin cobertura. | Correcto como estado vacio; cobertura de proveedores no certificada |

Fuentes oficiales consultadas para contrastar calendarios: [Premier League 2026/27](https://www.premierleague.com/en/news/4675097/all-380-fixtures-for-202627-premier-league-season), [calendario LaLiga 2026/27](https://www.laliga.com/calendar-2026-2027/laliga-easports) y [Champions League 2026/27](https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures-a/).

**Limite API-Football:** las cuatro busquedas nombradas de competiciones de clubes 2026/27 fueron omitidas por la proteccion de temporada gratuita. La busqueda global de fecha vacia pudo entrar en API-Football: una solicitud de lista y un reintento como maximo (limite conservador `<=2`; el conteo real no fue observable porque no habia telemetria persistida). El total exacto de la ronda queda **sin verificar**. No realizar mas llamadas reales hasta habilitar una forma segura de verificar el contador; el limite autorizado de 20 no se puede certificar solo con esta evidencia.

## Comandos complementarios

```powershell
npm test
npm run test:e2e
npm run build
```
