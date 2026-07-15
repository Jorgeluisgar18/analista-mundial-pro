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

## Comandos complementarios

```powershell
npm test
npm run test:e2e
npm run build
```
