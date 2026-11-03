# Runbook QA con APIs reales

Este runbook se usa cuando el owner autoriza una ronda de QA con proveedores reales. No reemplaza la matriz manual; la vuelve ejecutable y repetible.

## Reglas de cuota

- API-Football/API-Sports: máximo 20 intentos HTTP en toda la pasada PMA-02, incluidos reintentos y errores de red.
- The Odds API: usar primero flujo `/events`; solo consumir odds cuando el evento fue encontrado.
- TheSportsDB: puede usarse con mayor libertad en plan gratuito, pero registrar errores/latencia.
- Football-Data.org y Footballdata.io: registrar si el proveedor devuelve calendario sin detalle o datos parciales.
- No ejecutar smoke productivo sin `SMOKE_BASE_URL` confirmado.
- Registrar solo lo que devuelva el proveedor o la aplicación; no completar resultados, alineaciones, cuotas ni estados con valores inventados.

## Preparacion local

```powershell
npm run build
npm test
npm run test:e2e
```

Verifica en `/api/provider-status` que los proveedores esperados aparezcan configurados sin exponer secretos.

### Presupuesto local de API-Football para PMA-02

El owner confirmó un único proceso servidor, sin reinicios durante la pasada. El control es exclusivo de esta QA local: no es una cuota por usuario ni un rate limit distribuido para producción.

En una terminal dedicada, configura las claves de forma privada y arranca el servidor ya compilado:

```powershell
$env:DATABASE_URL = ""
$env:DIRECT_URL = ""
$env:API_FOOTBALL_QA_REQUEST_LIMIT = "20"
npm run start -- --port 3317
```

- Abre `http://localhost:3317`; no reutilices otro servidor, `next dev`, HMR o múltiples procesos.
- La consola registra `API-Football QA` con `pid`, `attempts`, `limit` y `remaining`, sin claves, URLs ni cabeceras. Todas las entradas deben tener el mismo PID.
- Cada llamada al fetcher reserva un intento antes de la operación, incluso si falla o es un reintento. Las llamadas concurrentes y las nuevas instancias del proveedor comparten el contador del proceso. Las redirecciones automáticas se rechazan para evitar solicitudes adicionales no contadas.
- Al agotar el presupuesto no se ejecuta otro fetch de API-Football. Otros proveedores conservan su comportamiento y sus propias cuotas.
- Es un conteo conservador de intentos locales, no una afirmación de llamadas facturadas: un error de red puede ocurrir antes de llegar al proveedor. Las cabeceras de cuota diaria se mantienen separadas.
- No cambies el límite, reinicies el proceso ni abras otro servidor para continuar la misma pasada. Ante cambio de PID, reinicio o conteo no verificable, detén la QA y registra el resultado incompleto; no declares un nuevo presupuesto de 20.
- El control permanece activo durante la vida del proceso una vez habilitado. No lo configures en Netlify. Al finalizar, cierra el servidor y la terminal dedicada.

Primero verifica el control sin red ni base de datos:

```powershell
npm test -- tests/unit/api-football-qa-budget.test.ts tests/unit/provider-registry.test.ts tests/unit/provider-http.test.ts tests/unit/api-football.test.ts
```

Este mecanismo no autoriza por sí mismo una ronda real ni certifica PMA-02: conserva en la matriz el contador acumulado, PID, horario Colombia y las observaciones reales.

## Casos minimos

| Bloque | Entrada de la ronda | Fuente a observar | Validacion factual |
|---|---|---|---|
| Mundial/selecciones | Fecha FIFA/Mundial confirmada durante la ronda; competición Mundial o `all` | API-Football y, si aplica, TheSportsDB | Mostrar únicamente los partidos devueltos, hora COT y fuente; si no hay calendario, estado vacío explicado. |
| Premier League | Fecha de jornada EPL confirmada | Football-Data.org y/o API-Football; The Odds API solo tras coincidencia en `/events` | Competición y calidad/fuente visibles; lista o vacío según la respuesta real. |
| Champions League | Fecha de jornada UEFA confirmada | API-Football; The Odds API solo tras coincidencia en `/events` | Competición y proveedor visibles; no afirmar cobertura que la respuesta no contenga. |
| LaLiga | Fecha de jornada LaLiga confirmada | Football-Data.org y/o API-Football; The Odds API si aplica | Identidad del partido y fuente visibles; escudos o detalle solo si fueron devueltos. |
| Fecha sin partidos | `2035-01-01` | Todos los configurados | Sin pantalla blanca: estado vacío y fuente explicada, sin fixtures de sustitución. |
| Alineación esperada | Partido futuro con formación prevista devuelta por la fuente | API-Football o caché real | Estado “esperada”; no inventar nombres, posiciones ni confirmación oficial. |
| Alineación oficial/parcial | Partido cercano con XI o estado de alineación devuelto por la fuente | API-Football | Estado “oficial” o “parcial” según la fuente; preservar nombres devueltos y no elevar un estado parcial. |
| Sin cuotas | Partido real sin mercado tras la búsqueda conservadora | The Odds API | Indicar ausencia de mercado/fuente; no prometer value betting ni fabricar cuotas. |
| Export HTML | Cabina resuelta con datos reales o parciales | Aplicación local | Exportar solo los datos disponibles, con fuentes, calidad, cancha cuando exista, cuotas cuando existan y trazabilidad. |

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

