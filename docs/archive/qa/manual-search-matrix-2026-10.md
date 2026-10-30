# QA manual — registros históricos de octubre de 2026

> Este documento preserva resultados de ejecuciones pasadas. No los uses como estado actual del producto ni como autorización para repetir llamadas. Las correcciones y decisiones posteriores están en el [plan personal vigente](../../superpowers/plans/2026-10-10-personal-match-analysis.md); la matriz reutilizable está en [docs/qa/manual-search-matrix.md](../../qa/manual-search-matrix.md).

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

## QA local controlada — 2026-10-26

La base de datos local se mantuvo desconectada intencionalmente. `/api/health` devolvio estado degradado/503; no se accedio a Neon. El servidor local de produccion se inicio una sola vez y se detuvo al finalizar.

| Caso | Entrada | Resultado observado | Estado |
|---|---|---|---|
| Premier League — partidos disponibles | `2026-10-31`, Premier League | La UI y `/api/matches` devolvieron 8 encuentros reales desde Footballdata.io; el horario se presento en COT. Chelsea–Manchester United fue seleccionado para intentar revisar su cabina. | Busqueda verificada; cabina pendiente |
| Fecha sin partidos — global | `2026-10-26`, `all` | 0 partidos. La UI explico que API-Football y Footballdata.io no tenian partidos para esa consulta. | Estado vacio verificado |
| Cabina — detalle, cuotas y alineaciones | `footballdata-io--740745803` | La pagina mostro “Datos reales no disponibles” porque el modo de produccion exige una base de datos configurada y la conexion se habia desactivado para esta QA. La proteccion rechaza el analisis antes de consultar el partido; no se observaron detalle, cuotas ni alineaciones. | No verificable en este entorno; proteccion conservada |

**Presupuesto API-Football:** el proceso protegido registro 4 intentos de un limite configurado en 18. Como el proceso anterior pudo haber realizado hasta 2 intentos antes de ser detenido, el maximo conservador acumulado para esta ronda es `<=6/20`; el total exacto sigue sin certificarse. No se hicieron mas llamadas reales.

## QA de cabina en desarrollo — 2026-10-26

Se inicio un proceso nuevo, separado de la pasada en modo produccion, en `next dev` con DB vacia y `API_FOOTBALL_QA_REQUEST_LIMIT=14` para respetar el maximo acumulado de 20. Se abrio directamente el partido ya encontrado, `footballdata-io--740745803`; no se repitio la busqueda ni se pulso actualizar. La pagina respondio 200, sin errores de consola; solo mostro el aviso esperado de Prisma por persistencia deshabilitada. El proceso se detuvo y el puerto local quedo libre.

| Caso | Entrada | Resultado observado | Estado |
|---|---|---|---|
| Cabina real — resumen y fuentes | Chelsea FC–Manchester United FC, `2026-10-31` 12:30 COT | La identidad y el horario se cargaron desde Footballdata.io. El encabezado dejo la competicion vacia y mostro `Competicion`; estadio/ciudad no disponibles. La fuente informo que stats y probabilidades del proveedor no estaban disponibles. | Hallazgo de normalizacion/copy |
| Cuotas | Mismo partido | La vista de mercados indico “sin cuota disponible”. Fuentes explico `Competición no soportada por The Odds API: Competicion`; por ese rechazo previo no se consulto `/events` ni se pidieron odds del evento. | Hallazgo de mapeo; sin cuota fabricada |
| Alineacion | Mismo partido | Ambos XI se mostraron como esperados, 4-2-3-1, sin nombres. La interfaz declaro “Jugadores esperados pendientes de fuente o proyección”; no se inventaron jugadores ni se presentaron como oficiales. | Parcial, comunicado explicitamente |
| Lesiones y suspensiones | Mismo partido | Las subsecciones mostraron “Sin reporte confirmado” y “Sin ... reportados ... en la fuente actual”. Footballdata.io no aporto disponibilidad de plantillas para este partido; la frase puede confundirse con confirmacion de que no existen bajas. | Hallazgo de copy/disponibilidad |
| Metodologia y calidad | Mismo partido | La UI enumera cuotas, forma e historico entre señales del modelo, aunque en esta misma cabina cuotas, estadisticas/probabilidades de fuente e historico calibrado figuran como no disponibles. Es una posible impresion de evidencia usada; la observacion no prueba por si sola un error en el calculo. | Hallazgo de trazabilidad/copy |

**API-Football:** el nuevo proceso no registro intentos; la consulta fue dirigida al proveedor de Footballdata.io y no se ejecuto API-Football. El total acumulado conserva el maximo conservador `<=6/20`, no un conteo exacto. No se llamo a `/events` de The Odds API porque el mapeo de competicion fallo antes de la solicitud.

## Click-through de cabina local — 2026-10-26

En un proceso `next dev` separado, con persistencia local desconectada y `API_FOOTBALL_QA_REQUEST_LIMIT=14`, se buscó una sola vez Premier League para `2026-10-31`. La consulta devolvió 8 partidos desde Footballdata.io; se abrió Chelsea FC–Manchester United FC (`footballdata-io--740745803`) desde el resultado. La cabina respondió HTTP 200 y se navegaron Plantillas, Mercados y Fuentes. Consola: cero errores y una advertencia de Prisma esperada por `DATABASE_URL` ausente. El servidor se detuvo al terminar y Neon no se tocó.

| Caso | Entrada | Resultado observado | Estado |
|---|---|---|---|
| Flujo buscar → informe | Premier League, `2026-10-31` | 8 partidos reales; el primer partido abrió la cabina con competición Premier League y hora `12:30 COT`. | Verificado localmente |
| Alineación esperada | Chelsea FC–Manchester United FC | Ambos XI aparecen como esperados, 4-2-3-1, sin nombres; la UI dice que faltan fuente o proyección. No se inventaron jugadores. | Limitación comunicada |
| Lesiones y suspensiones | Mismo partido | Ambas secciones muestran “Cobertura no disponible”; Footballdata.io no aporta esos datos en este flujo y no se infiere que no existan bajas. | Verificado y comunicado |
| Cuotas y mercados | Mismo partido | Las predicciones indican “sin cuota disponible” y “sin referencia de mercado”. La UI no presenta una cuota como observada. | Verificado; sin cuota disponible |
| Señal de refuerzo | Mismo partido | Aun sin cuota, se muestra el texto fijo “Datos de forma, producción y mercado alineados con el snapshot actual del partido.” El código lo presenta sin condición. | Hallazgo confirmado de copy; corrección con prueba pendiente |
| Cobertura/confianza | Mismo partido | La UI mostró 70% de cobertura y confianza 6/10 mientras el ledger indica estadísticas/probabilidades del proveedor no disponibles y la BD local está desconectada. No se concluye todavía que el cálculo sea erróneo: falta rastrear fuentes alternas y el predicado de fiabilidad del dataset. | Investigación pendiente; no tocar cálculos aún |
| Trazabilidad | Mismo partido | Footballdata.io identifica el partido y declara indisponibilidad de estadísticas/probabilidades y cobertura de bajas; The Odds API figura como fuente bajo demanda; TheSportsDB aporta escudos; el motor de alineación figura como inferencia. | Verificado en la UI |

**API-Football:** límite local de este proceso `14`; contador exacto `1` intento HTTP (búsqueda) y ningún intento adicional al abrir el detalle. Las pruebas anteriores solo permiten acotar el acumulado a `<=6`; total conservador de toda la ronda `<=7/20`, no exacto. No se reinició el proceso ni se hicieron llamadas extra.
