# QA real de proveedores y cierre de export

Fecha: 2026-07-14 / 2026-07-15 COT  
Responsable: Codex

## Alcance probado

- Health local: `/api/health`.
- Búsqueda local por fechas/competiciones:
  - Mundial / selecciones: `2026-06-15`, `wc-2026`.
  - Premier League: `2026-08-15`, `premier-league`.
  - Champions League: `2026-09-15`, `champions-league`.
  - LaLiga: `2026-08-15`, `la-liga`.
  - Fecha sin partidos esperados: `2031-01-01`, `premier-league`.
- Export HTML local: `/api/match/demo-col-bra/export`.
- Smoke producción solo lectura contra la URL conocida.

## Resultado local

| Caso | Resultado |
|---|---|
| Health local | 200 OK. Base de datos conectada. Telemetría conectada. Elo 100%. Backtesting listo con 817 muestras. |
| API-Football | Configurado. Uso observado: 1/100 diario en la ventana de prueba. |
| Footballdata.io | Configurado. Uso observado: 82/1000 mensual. |
| TheSportsDB | Configurado. Sin uso crítico registrado en el snapshot. |
| The Odds API | Configurado. Uso observado: 11/500 mensual. |
| Football-Data.org | Implementado, pero no configurado en `.env.local` durante esta QA (`FOOTBALL_DATA_API_KEY` ausente o no válida). |
| Mundial / selecciones | 200 OK, modo API, fuente Footballdata.io, 4 partidos. |
| Premier / Champions / LaLiga | 200 OK, fallback controlado a muestra local cuando no hay cobertura real disponible para la fecha consultada. |
| Fecha sin partidos | 200 OK, estado no vacío; comunica fallback/muestra local en vez de pantalla blanca. |
| Export HTML local | 200 OK, HTML autónomo. Incluye cancha táctica simplificada, bajas por tipo, calidad por proveedor y resumen de cuotas. |

## Resultado producción

La URL conocida `https://shiny-torte-4f01e2.netlify.app` respondió 404 para:

- `/api/health`
- `/api/match/demo-col-bra/export`

Conclusión: no se certifica producción en este cierre. Hay que confirmar la URL activa de Netlify o reactivar deploy/build cuando haya créditos antes del smoke post-deploy.

## Mejoras implementadas en este bloque

- Export HTML más auditable:
  - cancha táctica simplificada por equipo;
  - tablas separadas para lesionados, suspendidos y dudas;
  - calidad por proveedor;
  - resumen de cuotas por casa, mercado y selección.
- Pruebas:
  - unit test del export con dataset enriquecido;
  - E2E de descarga HTML validando los nuevos bloques.

## Pendientes reales

1. Configurar `FOOTBALL_DATA_API_KEY` en `.env.local` y en Netlify cuando se reactive producción.
2. Confirmar URL productiva activa antes del smoke final.
3. Ejecutar smoke post-deploy cuando Netlify vuelva a tener builds habilitados:
   - `/api/health`;
   - Neon conectado;
   - APIs configuradas;
   - búsqueda por ligas;
   - export HTML real.
4. Bloque avanzado futuro: calibración periódica automática por competición/liga y comparación formal de proveedores.
