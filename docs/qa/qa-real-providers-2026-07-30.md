# QA real controlada - 2026-07-30

**Entorno:** produccion, `https://analista-mundial-pro.netlify.app`  
**Objetivo:** validar calendario, detalle, alineaciones y cuotas con proveedores reales sin exceder la cuota de API-Football.

## Preparacion y limites

- `/api/health` al inicio y al cierre: `operational`, Neon y telemetria conectados.
- Configurados: API-Football, Footballdata.io, TheSportsDB y Open-Meteo.
- No configurados: Football-Data.org y The Odds API.
- El medidor de API-Football termino en `7 / 100` solicitudes diarias. La ronda uso cinco consultas de calendario y dos de detalle como maximo mediante la aplicacion; no uso secretos directamente ni supero el presupuesto acordado de 50.

## Resultados factuales

| Caso | Entrada | HTTP | Resultado observado | Estado |
|---|---|---:|---|---|
| Mundial | `2026-07-01`, `wc-2026` | 200 | Dos partidos desde Footballdata.io; se observo England National Team vs Congo DR. | Parcial: calendario real. |
| Champions League | `2026-07-08`, `champions-league` | 200 | Cuatro partidos desde Footballdata.io; se observo Kairat vs Sutjeska. | Parcial: calendario real. |
| Premier League | `2026-08-15`, `premier-league` | 503 | `Datos reales no disponibles`. | Fallo funcional. |
| LaLiga | `2026-08-15`, `la-liga` | 503 | `Datos reales no disponibles`. | Fallo funcional. |
| Fecha sin partidos | `2035-01-01`, `all` | 503 | `Datos reales no disponibles`. | Fallo funcional. |
| Detalle y alineaciones | `footballdata-io--690940473` | 200 | Partido finalizado, sin titulares ni bajas devueltos. La respuesta lo marca como alineacion `expected` vacia. | Hallazgo: no debe presentarse como alineacion esperada para un partido terminado. |
| Cuotas | mismo detalle | 200 | Cero cuotas. No se ejecuto The Odds API porque el proveedor no esta configurado en produccion. | Bloqueado por configuracion, sin datos inventados. |

## Hallazgos priorizados

1. **P0 - estado vacio tratado como error.** `matchService.listByDate` lanza `ProductionDataUnavailableError` cuando ningun proveedor devuelve partidos. En produccion responde 503 incluso para una fecha genuinamente vacia. Debe devolver 200 con `matches: []`, advertencias por proveedor y un estado vacio explicable; reservar 503 para proveedores no utilizables.
2. **P1 - alineacion esperada impropia en partidos terminados.** El detalle de Footballdata.io sin XI devuelve una estructura inferida `expected` aunque el partido esta `finished`. La interfaz debe mostrar "alineaciones no disponibles" y no una prediccion posterior al partido.
3. **P1 - cuotas bloqueadas por configuracion.** `odds-api` figura `configured: false` en `/api/health`; no hay verificacion real de mercados, value betting ni surebets en produccion. Falta configurar `ODDS_API_KEY` en Netlify y repetir una prueba `/events` seguida de un detalle coincidente.
4. **P2 - cobertura de ligas.** Premier y LaLiga no pudieron distinguir entre fecha sin cobertura, limite o fallo de proveedor debido al 503 agregado. El arreglo P0 debe preservar las advertencias de cada proveedor para poder diagnosticarlo desde UI/QA.

## Acciones posteriores a la ronda

- Se preparo una correccion con pruebas para devolver `200` y `matches: []` cuando al menos un proveedor responda correctamente sin calendario, manteniendo `503` para un fallo total de proveedores.
- Se preparo una correccion con pruebas para que un partido `finished` sin XI real use estado `unavailable`, nunca un once `expected`.
- `ODDS_API_KEY` quedo creada como secreto de produccion en Netlify y los builds continuos quedaron activos. Ambas configuraciones requieren el proximo deploy para poder validar cuotas en el runtime publicado.

## Veredicto

El deploy esta sano a nivel de runtime, base de datos y calendario parcial, pero no queda certificado para el flujo completo de busqueda real y cuotas. No se observaron secretos en las respuestas revisadas.
