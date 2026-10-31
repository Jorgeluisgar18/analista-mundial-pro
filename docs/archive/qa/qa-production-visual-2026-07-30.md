# QA real y visual de producción — 2026-07-30

**Entorno:** `https://analista-mundial-pro.netlify.app`  
**Zona horaria verificada:** Colombia (COT)  
**Límite API-Football observado al cierre:** 10/100 solicitudes del día.

| Caso | Entrada | Resultado | Estado |
|---|---|---|---|
| Premier League | 2026-08-15 · Premier League | HTTP 200, cero partidos y explicación de cobertura sin mezclar competiciones. | OK |
| La Liga | 2026-08-15 · La Liga | HTTP 200, cero partidos y estado vacío explícito. | OK |
| Champions League | 2026-08-26 · UEFA Champions League | HTTP 200, cero partidos y notas de proveedores. | OK |
| Mundial | 2026-07-01 · FIFA World Cup | Dos encuentros reales de Footballdata.io, banderas y horario COT visibles. | OK |
| Cabina de partido terminado | England National Team vs Congo DR National Team | Fuentes y cobertura visibles; XI no disponible se identifica como tal, sin plantilla inventada. | OK |
| Cuotas sin mercado | Mismo encuentro terminado | Odds API configurada; no se presentan cuotas ni valor accionable cuando no existe mercado prepartido. | OK |

## Hallazgo corregido antes de publicar

La etiqueta dinámica de alineación mostraba una codificación incorrecta (`AlineaciÃ³n`). Se corrigió a UTF-8 y se añadió una aserción de regresión en la prueba de alineaciones.

## Límites de la ronda

No había fixture futuro cubierto por los proveedores gratuitos para las fechas de Premier, La Liga y Champions consultadas. El producto informó la ausencia de calendario en vez de fabricar contenido. La validación de una alineación oficial futura y de cuotas disponibles debe repetirse cuando los proveedores publiquen un encuentro próximo compatible.
