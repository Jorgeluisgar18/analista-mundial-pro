# Informe final de auditoría técnica
### Analista Mundial Pro
**Repositorio auditado:** `github.com/Jorgeluisgar18/analista-mundial-pro` (rama `master`, estado al momento de la revisión)
**Metodología:** revisión progresiva por bloques (13 bloques de código + documentación interna), sin ejecución de código productivo, con lectura directa de archivos fuente, esquema de base de datos, tests, scripts y documentación.
**Nota metodológica importante:** la documentación interna (`docs/internal/handoff.md`) indica que, al momento de la última actualización del equipo, existían ~26 archivos modificados localmente sin subir a GitHub. Este informe refleja el estado de la rama `master` tal como se encontraba en el repositorio remoto al momento de la auditoría. Se recomienda confirmar si hay cambios locales más recientes antes de fijar prioridades definitivas.

---

## 1. Diagnóstico ejecutivo

**Analista Mundial Pro** es un proyecto con una base técnica considerablemente más sólida de lo que suele verse en productos en etapa inicial. El equipo (aparentemente compuesto por un desarrollador/owner que coordina agentes de IA de desarrollo) ha tomado decisiones de arquitectura correctas en varios puntos difíciles: modelo de datos con trazabilidad de evidencia, backtesting sin fuga de datos futuros, ensemble de 3 modelos estadísticos, manejo de cuotas de proveedores gratuitos, resolución de conflictos entre fuentes, y una suite de pruebas con 39 archivos que cubre unidades, integración y end-to-end.

Sin embargo, la auditoría encontró **un grupo pequeño de problemas de alto impacto que, si no se corrigen, comprometen la credibilidad central del producto** — no porque el sistema "se rompa", sino porque una parte relevante de lo que se comunica al usuario (mercados estadísticos diferenciados por partido, un indicador de confianza medido, un sistema de fuerza basado en Elo) no corresponde, en la implementación actual, con lo que realmente ocurre por debajo. A esto se suma una brecha de seguridad conocida y ya documentada por el propio equipo (edición pública sin control de acceso) y una brecha de proceso (no hay integración continua que valide cambios antes de desplegar).

**Madurez técnica general: media-alta**, con una **discrepancia crítica y localizada entre el mensaje de producto y la implementación real** en la porción del motor estadístico relacionada con Elo y mercados secundarios (córners, tarjetas, faltas, disparos, offsides). Esta discrepancia es completamente solucionable con esfuerzo moderado y sin necesidad de reescribir el proyecto.

**Los tres focos de atención inmediata, en orden de urgencia:**
1. Cerrar la brecha de autorización en `POST /api/match/[id]/overrides` — ya identificada por el propio equipo en `docs/security/auth-workspace-decision.md`, pero no implementada.
2. Resolver la discrepancia entre lo comunicado (Elo, mercados diferenciados) y lo implementado (constantes fijas) — o ajustando el mensaje, o completando la implementación.
3. Cerrar la brecha operativa de fallback silencioso de base de datos + falta de CI, para que un fallo de infraestructura no pase desapercibido.

Ninguno de estos tres puntos requiere una reescritura del proyecto. Los tres son alcanzables en semanas, no meses, con el equipo y las herramientas actuales.

---

## 2. Fortalezas

El proyecto tiene bases genuinamente buenas que conviene proteger y no perder de vista en medio de las correcciones:

| Área | Fortaleza confirmada |
|---|---|
| Modelos estadísticos | Implementación correcta de Poisson bivariante, ajuste Dixon-Coles para marcadores bajos, simulación Monte Carlo con semillas deterministas por partido, y métricas de evaluación estándar (Brier score, log loss, RPS) |
| Backtesting | Sin fuga de datos futuros (`look-ahead bias`): el cálculo de forma histórica usa exclusivamente partidos anteriores a la fecha evaluada, con decaimiento temporal exponencial |
| Ensemble | Combinación razonada de 3 modelos (60/20/20) con corrección de calibración histórica real, aplicada solo si hay muestra suficiente (≥30 partidos) — evita sobreajuste con poca muestra |
| Arquitectura de proveedores | Interfaces comunes (`FootballProvider`, `OddsProvider`, etc.), registro condicional por configuración, y una política de cuota (`apiQuotaPolicy`) genuinamente usada antes de cada llamada costosa |
| Gestión de costos | Estrategia de caché con TTL dinámico según proximidad al kickoff; The Odds API consulta primero el endpoint barato (`/events`) antes del costoso (`/odds`); conteo de cuota persistente en Postgres (no en memoria) |
| Resolución de evidencia | Sistema de prioridades entre fuentes (oficial > proveedor > manual > inferido) con detección explícita de conflictos, y estados ("confirmado", "inferido", "no disponible") consistentes en todo el dominio |
| Resiliencia | Fallback en cascada entre proveedores de fútbol con degradación ordenada a modo demo, claramente etiquetado, ante fallo total |
| Seguridad puntual | CSP con buenas prácticas base (`object-src 'none'`, `frame-ancestors 'none'`), protección same-origin en mutaciones, escapado consistente de HTML en el exportador, validación Zod robusta de overrides, sanitización de nombres de archivo |
| Testing | 39 archivos de test bien organizados por capa, incluyendo pruebas de configuración de seguridad (CSP) y flujos E2E completos de usuario |
| Accesibilidad | Manejo correcto de foco en modales, navegación por teclado en tablas interactivas, estados vacíos explícitos en vez de valores inventados |
| Ética de producto | Aviso de juego responsable presente de forma consistente en la web y en los reportes exportados; principios documentados de no prometer precisión sin validación histórica |
| Gobernanza | El equipo ya documenta decisiones de seguridad pendientes (autenticación) y mantiene un backlog de handoff detallado — señal de madurez de proceso, aunque la ejecución vaya un paso detrás de la intención |

Ninguna de estas fortalezas debe sacrificarse al corregir los hallazgos de la sección siguiente; de hecho, varias de ellas (evidencia con estados, calibración histórica, resolución de conflictos) son exactamente la base sobre la que se deben construir las correcciones.


---

## 3. Hallazgos priorizados por severidad

No se identificó ningún hallazgo P0 (que rompa el sistema, cause pérdida de datos o impida la operación principal). El sistema funciona y se degrada de forma ordenada ante fallos. Los hallazgos más severos son **P1**: no rompen la aplicación, pero comprometen la integridad de lo que se comunica al usuario o dejan una puerta abierta a abuso.

### P0 — Crítico
*Ninguno confirmado.*

---

### P1 — Importante (afecta funcionalidad clave, confiabilidad, seguridad relevante o integridad de producto)

#### H54 — Overrides manuales sin ningún control de autorización
- **Descripción:** `POST /api/match/[id]/overrides` permite a cualquier visitante del sitio insertar un "cambio manual" (lesión, sanción, ajuste táctico) que altera de inmediato el análisis mostrado a todos los usuarios de ese partido. El botón "Editar" está visible en la interfaz de análisis sin ningún gate de acceso.
- **Evidencia:** `src/app/api/match/[id]/overrides/route.ts` solo aplica `requireSameOrigin` + rate limit genérico (sin verificación de identidad/rol); `AnalysisCabin.tsx` expone el botón "Editar" a cualquier visitante; `docs/security/auth-workspace-decision.md` documenta que el equipo ya identificó este riesgo y estableció como meta evitar escritura pública "hasta que existan guardas de ruta y verificación de propiedad" — meta aún no implementada.
- **Impacto:** cualquier persona, sin conocimiento técnico, puede distorsionar el análisis de cualquier partido para todos los demás usuarios (ej. simular una lesión falsa de un jugador clave).
- **Recomendación:** ver Sección 4 (arquitectura) y Sección 10 (seguridad) para el diseño propuesto de control de acceso mínimo viable.
- **Esfuerzo estimado:** bajo-medio (un token de analista simple, sin sistema de usuarios completo, ya cierra el riesgo).
- **Prioridad de implementación:** inmediata — es el hallazgo de mayor riesgo práctico de toda la auditoría, y ya está en el radar del propio equipo.

#### H60 — El producto promete "Elo" como parte de su método; la implementación no lo tiene
- **Descripción:** tanto la landing (`page.tsx`, sección "hero-proof" y "Entender método") como la página de análisis (`SourcesSection.tsx`, tarjeta "Fuerza · Elo contextual + histórico") afirman explícitamente que el sistema usa Elo, considerando "rival, sede, recencia, forma ponderada y diferencia entre selecciones y clubes". La auditoría confirmó, con evidencia en 5 capas distintas del código (proveedores en vivo, forma histórica, normalización OpenFootball, script de importación, esquema de Prisma), que el campo de Elo nunca se calcula: en `apiFootball.ts` ambos equipos reciben `elo = 1500` idéntico; en `footballdataIo.ts` la diferencia es una constante fija de 10 puntos; el campo `opponentElo` de `HistoricalTeamMatch` nunca se escribe en ningún punto del pipeline de ingesta.
- **Evidencia:** `src/lib/providers/apiFootball.ts:467-468`, `src/lib/providers/footballdataIo.ts` (elo fijo), `src/lib/historical/form.ts:70-72` (`strengthMultiplier` neutro si `opponentElo` no existe), `grep -rn "opponentElo"` sin resultados de escritura en todo el repo, `src/app/page.tsx:41-48,100`, `src/components/analysis/sections/SourcesSection.tsx:75-81`.
- **Impacto:** discrepancia directa y verificable entre lo comunicado y lo implementado — un riesgo de credibilidad si un usuario técnico o un competidor lo detecta.
- **Recomendación:** ver Sección 5 (motor estadístico) para el diseño de un sistema de Elo real, o alternativa de mensaje honesto mientras no se implemente.
- **Esfuerzo estimado:** medio (implementar Elo real) o bajo (ajustar el mensaje mientras tanto).
- **Prioridad de implementación:** inmediata en el mensaje (bajo esfuerzo, cierra el riesgo de credibilidad ya); alta en la implementación real (siguiente sprint).

#### H22 — Mercados de córners, tarjetas, faltas, disparos y offsides idénticos para todo partido (proveedor API-Football)
- **Descripción:** las funciones `shots`, `shotsOnTarget`, `corners`, `cards`, `fouls`, `offsides` en `apiFootball.ts` son constantes numéricas fijas (10.5, 3.6, 4.5, 2.1, 11.5, 1.6) que nunca leen datos reales de la respuesta de la API. Estos valores alimentan directamente ~23 mercados de predicción mostrados al usuario con nombres reales de equipos (ej. "Más de 7.5 córners de España").
- **Evidencia:** `src/lib/providers/apiFootball.ts` función `normalizeStats` (líneas ~365-380); `src/lib/analysis/features.ts` (suma de `home.X + away.X`); `src/lib/analysis/analysisEngine.ts` (líneas 595-720, generación de mercados por categoría). Contraste: `footballdataIo.ts` sí intenta leer valores reales antes de caer en un valor por defecto, lo que confirma que el patrón correcto ya existe en el propio código.
- **Impacto:** para partidos servidos por el proveedor primario, una parte significativa de los mercados "diferenciados por equipo" son en realidad idénticos entre cualquier par de equipos — contradice la propuesta de valor de "análisis profundo, probabilidades explicables".
- **Recomendación:** ver Sección 5 y Sección 7 (proveedores).
- **Esfuerzo estimado:** medio (requiere evaluar si el plan de API-Football usado realmente expone estos campos, y en caso contrario, decidir fuente alternativa o retirar mercados).
- **Prioridad de implementación:** alta, siguiente sprint tras H54.

#### H29 — No existe ningún sistema de Elo real (raíz técnica de H60)
- **Descripción:** ver H60. Este ítem es la causa técnica; H60 es su consecuencia de producto/comunicación. Se listan por separado porque requieren remedios técnicos distintos y complementarios (implementar Elo vs. ajustar el mensaje).
- **Esfuerzo estimado:** medio — ver diseño propuesto en Sección 5.
- **Prioridad de implementación:** alta.

#### H34 / H66 — El indicador de confianza mostrado al usuario tiene componentes mayormente constantes, y su guardrail de seguridad está inutilizado
- **Descripción:** `calculateConfidence()` pondera 5 factores (cobertura 25%, frescura 20%, acuerdo 20%, estabilidad del modelo 20%, calibración 15%); en la práctica, `freshness` y `modelStability` son casi siempre constantes fijas (`0.87`, `0.82`) en vez de mediciones reales. Además, el guardrail diseñado para bajar la confianza cuando faltan estadísticas base (`hasBaseStats`) usa `Boolean(dataset.home.shots && dataset.away.shots)`, que siempre es `true` porque los valores fabricados de H22 nunca son `0`/`undefined`.
- **Evidencia:** `src/lib/analysis/analysisEngine.ts:498-508`; `src/components/analysis/ConfidenceBadge.tsx` (tooltip que describe la fórmula como si fuera una medición precisa).
- **Impacto:** el "Confianza del modelo" que ve el usuario transmite mayor rigor del que existe realmente, y el mecanismo pensado para detectar datos pobres no puede activarse.
- **Recomendación:** ver Sección 5.
- **Esfuerzo estimado:** bajo-medio.
- **Prioridad de implementación:** alta, junto con H22 (comparten la misma causa raíz).

#### H09 — Fallback silencioso de base de datos a modo "sin persistencia"
- **Descripción:** si `DATABASE_URL`/`NETLIFY_DB_URL` fallan o no están configuradas, `src/lib/db/prisma.ts` retorna un cliente `noop` que responde vacío en silencio (solo `console.warn`), sin lanzar error visible.
- **Evidencia:** `src/lib/db/prisma.ts`. Mitigación parcial existente: `src/app/api/health/route.ts` sí expone `database: "unavailable"` de forma explícita, y `HealthPanel.tsx` lo muestra en la home pública; `scripts/smoke-production.ts` verifica esto tras despliegues manuales.
- **Impacto:** sin monitoreo activo de `/api/health`, la app podría operar en modo "demo silencioso" en producción sin que nadie lo note. La propia documentación interna del equipo (`docs/internal/handoff.md`) marca como *"no verificado aún"* el funcionamiento de Neon en producción a la fecha del último handoff — confirma que esto no es un riesgo hipotético sino una duda operativa real y reconocida por el equipo.
- **Recomendación:** ver Sección 9 (performance/costos) y Sección 10 (seguridad).
- **Esfuerzo estimado:** bajo (activar monitoreo externo gratuito).
- **Prioridad de implementación:** inmediata (es la corrección más barata de toda la lista).

#### H18 — Rate limiting en memoria no confiable en entorno serverless
- **Descripción:** `src/lib/http/rateLimit.ts` usa un `Map` en memoria a nivel de módulo. En Netlify Functions, cada invocación puede ejecutarse en una instancia distinta, por lo que el límite real entre invocaciones "frías" no es confiable.
- **Evidencia:** `src/lib/http/rateLimit.ts`; usado en `analyze`, `refresh`, `overrides`.
- **Impacto:** las rutas de mutación (especialmente `overrides`, agravado por H54) no tienen un límite de frecuencia realmente confiable contra abuso repetido.
- **Recomendación:** ver Sección 4 y Sección 10.
- **Esfuerzo estimado:** medio (mover el conteo a la tabla `ApiUsage`/una tabla dedicada, ya existe el patrón persistente en `apiUsageService.ts`).
- **Prioridad de implementación:** alta, en conjunto con H54.

#### H75 — Los tests existentes no cubren los campos exactos donde están H22/H29 (causa raíz de por qué no se detectaron)
- **Descripción:** `tests/unit/api-football.test.ts` solo verifica `goalsFor`; nunca verifica `shots`, `corners`, `cards`, `fouls`, `offsides` ni `elo`. `tests/unit/ensemble.test.ts` solo verifica que las probabilidades sumen 100%, no que el modelo diferencie entre equipos de distinta fuerza.
- **Impacto:** explica por qué H22/H29 llegaron a producción: no es falta de tests, es falta de aserciones en los campos correctos.
- **Recomendación:** ver Sección 8 (QA).
- **Esfuerzo estimado:** bajo.
- **Prioridad de implementación:** alta, en paralelo a la corrección de H22/H29 (agregar el test que falla hoy, luego corregir el código hasta que pase).

#### H86 — Subsecciones de navegación sin funcionalidad diferenciada (frontend)
- **Descripción:** de las 10 secciones de análisis, **7 de ellas definen subsecciones en la navegación (`AnalysisCabin.tsx`) que no producen ningún cambio de contenido real al seleccionarlas** — solo cambia el texto del título. Esto significa que aproximadamente 30 de los ~44 "tabs" de navegación del producto son, en la práctica, redundantes entre sí dentro de su sección.
- **Evidencia detallada por sección:**

| Sección | Subsecciones definidas | Estado | Evidencia puntual |
|---|---|---|---|
| 01 · Resumen | Panorama, Probabilidades, Escenarios, Confianza | **No funcional** | `SectionContent.tsx` invoca `<SummarySection analysis={analysis} />` **sin pasar `activeSubsection`** — el componente ni siquiera recibe la subsección seleccionada |
| 02 · Contexto | Necesidad, Forma reciente, Rivales, Motivación y presión | **No funcional** | `ContextSection.tsx` recibe `subsection` solo para el título (`Contexto · ${subsection}`); el array `rows` que se renderiza es idéntico sin importar la subsección |
| 03 · Táctica | Formaciones, Plan ofensivo, Plan defensivo, Duelos, Ajustes 2T | **No funcional** | `TacticsSection.tsx`: mismo patrón — formaciones + los 4 bloques tácticos se muestran siempre juntos, `subsection` solo cambia el título |
| 04 · Plantillas | Alineaciones, Lesionados, Suspendidos, En duda, Reemplazos | **No funcional (con arreglo fácil disponible)** | `SquadsSection.tsx` ya recibe `dataset.availability` con un campo `item.type` que distingue exactamente lesión/sanción/duda — pero no se usa para filtrar; se muestra la lista completa siempre |
| 05 · Mercados | Resultado, Marcador exacto, Goles, Corners, Tarjetas, Faltas, Disparos, Fueras de juego | ✅ **Funcional** | `MarketsSection.tsx` filtra correctamente `analysis.predictions` por categoría derivada de `subsection` — es el patrón de referencia correcto |
| 06 · Jugadores | Goleadores, Asistencias, Disparos, Faltas, Tarjetas | ✅ **Funcional (aunque con diseño implícito y frágil)** | `PlayersSection.tsx` reordena jugadores según un mapa `SORT_KEYS`; "Disparos" no está en el mapa explícito pero coincide por casualidad con el valor por defecto (`?? "shots"`) — funciona, pero de forma no explícita |
| 07 · Porteros | Proyección, Paradas, Portería a cero, Riesgos | **No funcional** | `KeepersSection.tsx`: mismas 2 tarjetas de portero con todos los datos siempre visibles, `subsection` solo en el título |
| 08 · Valor y riesgo | Conservador, Moderado, Arriesgado, Solo observación, Surebets | ✅ **Funcional** | `ValueSection.tsx` filtra por `valueTier === subsection` y tiene una vista dedicada completa para "Surebets" — segundo patrón de referencia correcto |
| 09 · Alertas | Prepartido, Alineaciones, Clima, Árbitro, Movimiento de cuotas | **No funcional** | `AlertsSection.tsx`: mismo listado de alertas activas + los mismos 6 ítems de monitoreo hardcodeados, sin importar la subsección; `analysis.alerts` no tiene siquiera un campo de categoría para filtrar (a diferencia de Plantillas) |
| 10 · Fuentes | Evidencia, Calidad, Metodología | **No funcional** | `SourcesSection.tsx`: mismo bloque de calidad + calibración + ledger + metodología siempre visible, `subsection` solo en el título |

- **Impacto:** experiencia de usuario confusa (clics que no producen cambios visibles aparentan un error de la aplicación) y trabajo de diseño/navegación invertido sin retorno — 30 tabs que no cumplen su promesa individual.
- **Recomendación:** el proyecto **ya tiene, en su propio código, dos ejemplos correctos de cómo debe hacerse** (`MarketsSection.tsx` y `ValueSection.tsx`): filtrar los datos reales por la subsección seleccionada. Para cada sección rota, hay dos caminos válidos (ver detalle y guía paso a paso en la Sección 6 — Frontend/UI-UX):
  1. **Dotarla de funcionalidad real coherente con su nombre** (recomendado cuando el dato subyacente ya existe, como en Plantillas), replicando el patrón de `MarketsSection`/`ValueSection`.
  2. **Eliminar la subdivisión y dejar la sección como una sola vista completa** (recomendado cuando separar el contenido no aporta valor real, por ejemplo si "Panorama/Probabilidades/Escenarios/Confianza" en Resumen tiene sentido como una sola lectura ejecutiva continua).
- **Esfuerzo estimado:** bajo por sección (medio en total, ~7 secciones); no requiere cambios de arquitectura, solo lógica de filtrado o simplificación de navegación.
- **Prioridad de implementación:** media-alta — no es un riesgo de seguridad ni de datos, pero es una brecha de calidad de producto fácil y barata de cerrar, con alto impacto perceptible en la experiencia de usuario.

---

### P2 — Deuda técnica significativa / riesgo medio

| ID | Descripción | Evidencia | Impacto | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|---|
| H03 | Pooling de conexión Postgres no confirmado explícitamente (Prisma + `pg` sin parámetros de pool visibles) | `src/lib/db/prisma.ts` | Riesgo de agotamiento de conexiones bajo carga en entorno serverless si no se usa el endpoint *pooled* de Neon | Confirmar que `DATABASE_URL` apunta al endpoint `-pooler` de Neon; documentarlo en `docs/deployment` | Bajo | Alta |
| H10 | CSP con `script-src 'self' 'unsafe-inline'` incluso en producción | `next.config.ts` | Debilita la protección contra XSS que la CSP busca dar | Migrar a nonces/hashes soportados nativamente por Next.js App Router | Medio | Media |
| H17 | Sin limpieza de `MatchSnapshot` antiguos | `src/lib/cache/matchSnapshotCache.ts` | Crecimiento indefinido de la tabla, relevante en plan gratuito de Neon (límite de almacenamiento) | Job de limpieza periódico o borrado al insertar el snapshot N+4 | Bajo | Media |
| H42 | Riesgo compuesto: si la BD falla (H09), la protección de cuota de proveedores (`ApiUsage`) también queda desactivada sin alerta | `apiUsageService.ts` + `prisma.ts` | Consumo de cuota gratuita sin protección real en el peor escenario | Aplicar un límite conservador "a ciegas" cuando `getDatabaseRuntimeStatus()` reporte no disponible | Medio | Media |
| H53 | `POST /api/match/[id]/refresh?force=true` bypasea caché; protegido solo por rate limit en memoria (H18). No expuesto en la UI estándar, pero técnicamente alcanzable | `route.ts` + `AnalysisCabin.tsx` (UI no envía el parámetro) | Riesgo técnico real pero de explotación no trivial para un usuario común | Mover el límite de esta ruta específica a conteo persistente | Bajo | Media |
| H67 | `MarketTable` no distingue visualmente mercados con datos reales vs. estimados/constantes | `MarketTable.tsx` | El usuario no puede saber cuándo un mercado es menos confiable | Usar el campo `evidenceStatus` ya existente en el dominio para una etiqueta visual | Bajo | Alta (barato y de alto valor de confianza) |
| H77 | No existe pipeline de CI (GitHub Actions u otro); Netlify solo ejecuta `npm run build`, no los tests | Ausencia de `.github/workflows`; `netlify.toml` | Un cambio que rompa tests puede desplegarse sin bloqueo | Agregar CI gratuito que ejecute `npm test` en cada push/PR | Bajo-medio | Alta |
| H82 | Sin automatización (cron/scheduled function) para recalibración histórica (`run-backtest.ts`) ni actualización de datos (`import-openfootball.ts`) | Ausencia de configuración de scheduled functions | La calibración histórica (fortaleza real del motor) puede quedar desactualizada indefinidamente | Netlify Scheduled Functions (tier gratuito) ejecutando el backtest periódicamente | Medio | Media |
| H76 | Falta un test de "sensibilidad del modelo" (dos datasets de fuerza distinta deben producir probabilidades distintas) | `tests/unit/ensemble.test.ts` | Este tipo de test habría detectado H29 antes de producción | Agregar el test como parte de la corrección de H29 | Bajo | Alta |
| H25 | Sin reintentos ante fallos transitorios de proveedores (mitigado parcialmente por fallback en cascada entre proveedores) | `apiFootball.ts` | Degradación innecesaria ante errores 5xx/timeout puntuales | Reintento simple (1-2 intentos, backoff corto) antes de recurrir al siguiente proveedor | Bajo | Baja-media |

---

### P3 — Mejora menor, limpieza o ajuste futuro

| ID | Descripción | Recomendación | Esfuerzo |
|---|---|---|---|
| H13 | Campos JSON almacenados como `String` en vez de `Json` nativo | Migrar si se necesita consultar su contenido con SQL en el futuro | Medio |
| H23, H26 | Constantes mágicas sin documentar (promedios de liga, año límite de temporada gratuita de API-Football) | Mover a configuración documentada | Bajo |
| H24 | Colores de equipo fijos (no reales por club) | Confirmar si es decisión de branding intencional | Bajo |
| H28 | Heurística de texto para detectar "selección nacional genérica" | Aceptable por ahora; revisar si aparecen falsos negativos con más proveedores | Bajo |
| H31 | Emparejamiento de eventos en The Odds API por nombre/ventana horaria, sin ID cruzado | Limitación aceptable; documentar | — |
| H33, H74 | Catálogo de competiciones y mapa de banderas estáticos — expandir cobertura requiere editar código | Documentar el proceso de "cómo agregar una liga/selección nueva" | Bajo |
| H38 | Parámetro `rho` de Dixon-Coles fijo, no recalibrado contra datos propios | Evaluar recalibración en el pipeline de backtesting | Medio |
| H48 | *(Resuelto)* Zona horaria fija a Colombia — confirmado como decisión de producto intencional, no limitación técnica | Ninguna acción | — |
| H64 | Fecha inicial hardcodeada (`2026-06-15`) en el buscador de partidos | Cambiar a fecha actual dinámica tras el Mundial 2026 | Bajo |
| H71 | Panel de salud técnico expuesto de forma prominente en la home pública | Evaluar si conviene un resumen simple + detalle técnico en página aparte | Bajo |
| H84 | Migraciones legacy de SQLite conservadas en el repo | Archivar o eliminar | Bajo |


---

## 4. Recomendaciones de arquitectura

La arquitectura general (Next.js App Router + Prisma + Neon + capas separadas en `src/lib`) es sólida y no requiere reescritura. Las siguientes son propuestas concretas de estructura para cerrar los hallazgos P1/P2 sin romper lo existente.

### 4.1 Capa de autorización mínima viable (cierra H54, refuerza H18)

No hace falta un sistema de usuarios completo para cerrar H54. Propuesta de estructura nueva:

```
src/lib/auth/
  ├── analystToken.ts       # valida un token de analista contra variable de entorno
  ├── types.ts               # AuthContext { role: "viewer" | "analyst" }
  └── requireAnalyst.ts      # guard de ruta, similar en estilo a requireSameOrigin
```

Diseño mínimo (concepto, no código final):
- Variable de entorno nueva `ANALYST_ACCESS_TOKEN` (un valor secreto simple, no una contraseña de usuario).
- El frontend, en `UpdatePanel.tsx`, pide ese token la primera vez (guardado en memoria de sesión de React, **nunca en localStorage** por la restricción de artifacts, pero esto es la app real por lo que si aplica localStorage/cookie httpOnly del lado del navegador real, no del artifact) y lo envía como header `X-Analyst-Token`.
- `requireAnalyst(request)` en `src/lib/http/`, con el mismo estilo que `requireSameOrigin`, compara el header contra `process.env.ANALYST_ACCESS_TOKEN` y retorna `problem(401, ...)` si no coincide.
- Se aplica en `POST /api/match/[id]/overrides` (y opcionalmente en `refresh?force=true` si se decide restringir también ese bypass).

Esto es intencionalmente **de bajo esfuerzo**: no requiere tabla de usuarios, hashing de contraseñas, ni sesiones — soluciona el 90% del riesgo real (visitantes anónimos escribiendo datos) con una fracción del esfuerzo de un sistema de auth completo. Si más adelante el producto crece y se necesitan roles reales (Owner/Analyst/Viewer, como ya prevé `docs/security/auth-workspace-decision.md`), este mismo módulo `src/lib/auth/` es el punto de extensión natural — se reemplaza `analystToken.ts` por una verificación de sesión real sin tocar las rutas que ya usan `requireAnalyst`.

### 4.2 Rate limiting persistente (cierra H18)

Reemplazar el `Map` en memoria por un conteo en base de datos, reutilizando el patrón ya existente y probado en `apiUsageService.ts`:

```
src/lib/http/
  └── persistentRateLimit.ts   # misma firma que checkRateLimit, pero respaldada por tabla Prisma
```

Estructura de datos sugerida (nuevo modelo Prisma, mínimo):
```prisma
model RequestRateLimit {
  id         String   @id @default(cuid())
  bucketKey  String   // ej. "overrides:203.0.113.4"
  windowKey  String   // periodo redondeado (minuto/hora)
  count      Int      @default(1)
  updatedAt  DateTime @updatedAt

  @@unique([bucketKey, windowKey])
}
```
Con un `upsert` + `increment` atómico por request (Prisma soporta `increment` en `update`), este conteo es confiable entre invocaciones serverless, igual que `ApiUsage`. Mantener el `Map` en memoria como caché de primer nivel (para no golpear la BD en cada request) es una optimización válida *después* de que el conteo persistente exista como fuente de verdad.

### 4.3 Servicio de Elo real (cierra H29/H60/parte de H22)

Propuesta de nuevo módulo, aprovechando que el esquema de Prisma **ya tiene el campo `opponentElo`** listo para usarse:

```
src/lib/rating/
  ├── eloEngine.ts        # cálculo puro: K-factor, expectativa, actualización post-partido
  ├── eloRepository.ts    # lectura/escritura del rating actual por equipo (tabla nueva o reutilizando HistoricalTeamMatch)
  └── eloBackfill.ts       # script/rutina para inicializar ratings desde el histórico de OpenFootball ya importado
```

Diseño conceptual (fórmula Elo estándar adaptada a fútbol, con ajuste por margen de gol si se desea más adelante):
```
expectedScore(ratingA, ratingB) = 1 / (1 + 10^((ratingB - ratingA) / 400))
newRating = oldRating + K * (actualScore - expectedScore)
```
Puntos de integración:
1. **`historicalSignalService.ts`** (Bloque 6) ya ingiere cada partido finalizado — es el lugar natural para, en el mismo flujo, actualizar el Elo de ambos equipos y escribirlo en `opponentElo`/una tabla `TeamRating` nueva.
2. **`eloBackfill.ts`** se ejecutaría una vez sobre el histórico ya importado por `import-openfootball.ts`, para no partir de cero.
3. **`matchService.ts`/`features.ts`** dejarían de usar el valor fijo de los proveedores en vivo y consultarían `eloRepository.getRating(teamId)` en su lugar.

Esto es un esfuerzo medio (no trivial, pero acotado: la fórmula es simple, el punto de enganche ya existe) y resuelve H29, H60 y mejora la calidad real del término `eloDelta` en `features.ts`.

### 4.4 Marcado explícito de "dato real vs. estimado" en el dominio (cierra H22, H34, H67)

Se recomienda extender el tipo de dataset normalizado para que cada estadística de conteo (shots, corners, cards, fouls, offsides) lleve, junto al valor, un indicador de procedencia — reutilizando el mismo concepto de `Evidence.status` que ya existe para otros campos:

```ts
// src/types/domain.ts (extensión, no reemplazo)
interface CountedStat {
  value: number;
  status: "observed" | "estimated" | "unavailable";
}
```

Con este cambio:
- `apiFootball.ts` marcaría `shots`, `corners`, etc. como `status: "estimated"` (o `"unavailable"`) en vez de un número "mudo".
- `hasBaseStats` en `confidence.ts` pasaría a verificar `status === "observed"` en vez de `Boolean(valor)` — arreglando H34 de raíz.
- `MarketTable.tsx` podría mostrar un ícono/etiqueta cuando `status !== "observed"` — arreglando H67.

Este es el cambio de mayor apalancamiento de todo el informe: una sola extensión de tipo resuelve simultáneamente H22 (visibilidad del problema, aunque no lo "arregla" por sí sola), H34 (guardrail de confianza) y H67 (transparencia visual).

### 4.5 Observabilidad mínima (refuerza H09)

No se requiere una plataforma de monitoreo paga. Propuesta de bajo costo:
- Un servicio gratuito de uptime externo (ej. UptimeRobot, Better Uptime en su tier gratuito) que haga `GET /api/health` cada 5 minutos y alerte por email/webhook si `database !== "connected"`.
- Esto es puramente configuración externa, cero cambios de código, y cierra la parte operativa de H09 que el código por sí solo no puede resolver.


---

## 5. Recomendaciones para el motor estadístico/probabilístico deportivo

### 5.1 Calidad del modelo actual
El núcleo matemático (Poisson bivariante + ajuste Dixon-Coles + simulación Monte Carlo + regresión logística, combinados en un ensemble 60/20/20) está **correctamente implementado** y sigue literatura académica estándar de modelado de fútbol. Esto es una base genuinamente buena — el problema no está en las fórmulas, está en la calidad de algunos de los **datos de entrada** que alimentan esas fórmulas.

### 5.2 Fuentes de datos y supuestos
- El resultado principal (1X2, home/draw/away) se apoya en `goalsFor`/`goalsAgainst`, que sí tienen una ruta de lectura real desde los proveedores con fallback razonable a promedios de liga — **este es el componente más confiable del motor**.
- Los mercados secundarios (córners, tarjetas, faltas, disparos, offsides) dependen de datos que, para el proveedor primario, nunca se leen realmente (H22) — **es el componente menos confiable**, y debe tratarse de forma diferenciada del resultado principal en la comunicación al usuario mientras no se corrija.
- El término de Elo (H29) no aporta señal real en ningún proveedor — el modelo actualmente se apoya, sin saberlo explícitamente, casi enteramente en forma reciente y promedios de gol para el ajuste de "fuerza relativa", no en Elo.

### 5.3 Features
Se recomienda, a mediano plazo, ampliar el set de features más allá de goles/córners/tarjetas hacia métricas de proceso (posesión, xG si algún proveedor gratuito lo ofrece, distancia recorrida) — pero esto es una mejora de segunda fase, **no debe priorizarse antes de resolver H22/H29**, ya que agregar más features sobre una base con datos fabricados solo distribuye el problema, no lo resuelve.

### 5.4 Calibración y validación histórica
Es, junto con el manejo de evidencia, la parte más madura del proyecto: `run-backtest.ts` calcula Brier score, log loss y RPS sin fuga de datos futuros, y la calibración solo se aplica con muestra suficiente (≥30 partidos). **Recomendación:** automatizar su ejecución periódica (ver H82, Sección 4.5 no aplica aquí sino Scheduled Functions) para que la calibración no quede congelada en el tiempo.

### 5.5 Riesgo de sobreajuste
No se detectó evidencia de sobreajuste per se (el modelo no "aprende" de un conjunto de entrenamiento en el sentido de machine learning clásico; es un modelo estadístico paramétrico con calibración post-hoc), pero el parámetro `rho` de Dixon-Coles está fijo en `-0.08` sin recalibrar contra los datos propios del proyecto (H38) — una oportunidad de mejora de segunda fase, no urgente.

### 5.6 Trazabilidad de predicciones
Fuerte: el sistema de evidencia (`resolveEvidence.ts`), el `SourceLedger` en la UI, y el modelo de datos (`EvidenceRecord`, `ProviderTelemetry`) ya dan trazabilidad real de "de dónde salió este dato". La recomendación de la Sección 4.4 (marcar `estimated` vs `observed`) es la pieza que falta para que esa trazabilidad llegue también a los mercados de conteo.

### 5.7 Interpretación de probabilidades e incertidumbre
El manejo de incertidumbre vía Monte Carlo y la comunicación de "la probabilidad no equivale a certeza" (visto en `SummarySection.tsx`) son coherentes con buenas prácticas. **Limitación real que debe comunicarse siempre, no solo internamente:** ningún modelo estadístico de fútbol, por bien construido que esté, puede capturar eventos de baja probabilidad y alto impacto (lesión súbita, error arbitral, condiciones extremas de último momento) — esto no es una falla del proyecto, es una limitación inherente a cualquier modelo de este tipo, y debe quedar explícito en el mensaje al usuario (el aviso de juego responsable ya cubre parte de esto).

**No se debe prometer, en ningún punto del producto, exactitud predictiva.** El proyecto ya evita esto en general (buen indicio); el único punto de fricción real es H60 (Elo), que promete un método, no un resultado — pero de todas formas debe corregirse por honestidad de producto.

---

## 6. Recomendaciones frontend UI/UX

### 6.1 Subsecciones sin funcionalidad diferenciada (H86) — guía de corrección sección por sección

Como se detalló en el Hallazgo H86, 7 de 10 secciones tienen subsecciones de navegación que no cambian el contenido mostrado. A continuación, la recomendación concreta para cada una:

| Sección | Recomendación | Justificación |
|---|---|---|
| **01 · Resumen** | **Eliminar la subdivisión.** Dejar "Resumen" como una única vista continua (que es, de hecho, lo que ya se renderiza). | Panorama/Probabilidades/Escenarios/Confianza forman una lectura ejecutiva natural que no gana claridad al fragmentarse; fragmentarla obligaría a repetir el mismo componente `ProbabilitySummary` en cada tab sin aportar información nueva. |
| **02 · Contexto** | **Dar funcionalidad real.** Filtrar `rows` según `subsection`: "Necesidad" → solo las 2 filas de necesidad competitiva; "Forma reciente" → solo la fila de puntos por partido; "Rivales" → requiere agregar historial head-to-head si existe en `dataset` (o retirar esta subsección si no hay datos para ella); "Motivación y presión" → las filas de motivación/presión. | El dato ya existe separado en el array `rows`; es cuestión de indexarlo por `subsection` en vez de mostrarlo todo siempre. |
| **03 · Táctica** | **Dar funcionalidad real.** "Formaciones" → solo el grid de `FormationPitch`; "Plan ofensivo"/"Plan defensivo"/"Duelos"/"Ajustes 2T" → cada uno su tarjeta correspondiente de `tactical-notes`, ya que estas 4 tarjetas ya están individualizadas en el código, solo faltan mostrarse condicionalmente. | Es el caso más fácil de arreglar de toda la lista: las 4 tarjetas ya existen como bloques separados en el JSX, solo falta un `if (subsection === "Plan ofensivo") return <...>`. |
| **04 · Plantillas** | **Dar funcionalidad real (la más directa de todas).** Filtrar `dataset.availability` por `item.type` cuando `subsection` sea "Lesionados"/"Suspendidos"/"En duda"; "Alineaciones" → mostrar solo `lineup-columns`; "Reemplazos" → filtrar por `item.replacement` no nulo. | El campo `item.type` que se necesita para filtrar **ya existe y ya se muestra en pantalla** (`availability-${item.type}`) — es literalmente un `.filter()` de una línea. |
| **05 · Mercados** | Ninguna acción — ya es el patrón de referencia correcto. | — |
| **06 · Jugadores** | **Formalizar el mapeo.** Agregar explícitamente `Disparos: "shots"` a `SORT_KEYS` en vez de depender del valor por defecto implícito. | Hoy funciona "por casualidad"; hacerlo explícito evita que un futuro cambio al valor por defecto rompa esta subsección sin que nadie lo note. |
| **07 · Porteros** | **Dar funcionalidad real.** "Proyección" → el grid comparativo completo (vista general); "Paradas" → solo el dato de `saves`; "Portería a cero" → solo `cleanSheet`; "Riesgos" → solo el texto de `keeperRisk`. | Los 3 datos (`cleanSheet`, `saves`, `risk`) ya están calculados por separado en `KeeperCard`; solo falta condicionar qué `<dt>/<dd>` se muestra según `subsection`. |
| **08 · Valor y riesgo** | Ninguna acción — ya es el segundo patrón de referencia correcto. | — |
| **09 · Alertas** | **Requiere trabajo de datos primero.** Agregar un campo de categoría a `analysis.alerts` (ej. `category: "lineup" \| "weather" \| "referee" \| "odds-movement" \| "pre-match"`) en el motor de análisis, y luego filtrar en el componente igual que en Plantillas. Si no se quiere invertir en esto ahora, **eliminar la subdivisión** temporalmente y dejar una sola lista de alertas. | A diferencia de Plantillas, aquí el dato de categoría no existe todavía — es la única sección donde "agregar funcionalidad" requiere tocar el motor de análisis, no solo el componente visual. |
| **10 · Fuentes** | **Dar funcionalidad real.** "Evidencia" → solo `SourceLedger`; "Calidad" → solo `quality-strip`; "Metodología" → solo el bloque `methodology`. | Los 3 bloques ya están completamente separados en el JSX; es el segundo caso más fácil de arreglar después de Táctica. |

**Regla general para decidir "arreglar vs. eliminar":** si el dato para diferenciar la subsección ya existe en el modelo de dominio (Plantillas, Táctica, Fuentes, Jugadores), es casi siempre más barato dar funcionalidad real que eliminar la navegación. Si el dato no existe todavía y crearlo requiere tocar el motor de análisis (Alertas), o si fragmentar el contenido no aporta claridad real (Resumen), es preferible simplificar la navegación en vez de fingir una funcionalidad que no existe.

### 6.2 Otras recomendaciones de UI/UX
- **Indicador de confianza:** ajustar el tooltip de `ConfidenceBadge` para no sugerir mayor precisión de la que existe hoy (ver H34/H66), o completar la medición real de sus componentes antes de mantener el mensaje actual tal cual.
- **Transparencia de mercados:** aplicar la etiqueta de `estimated`/`observed` propuesta en la Sección 4.4 directamente en `MarketTable.tsx`.
- **Jerarquía de información en la home:** evaluar mover el `HealthPanel` detallado (uso de cuota, telemetría por proveedor) a una página secundaria (`/docs/estado` o similar), dejando en la home un indicador simple ("Datos en vivo" / "Modo de respaldo"), coherente con el objetivo declarado de "experiencia premium".
- **Accesibilidad:** el proyecto ya tiene buen nivel (foco en modales, navegación por teclado en tablas) — usar `UpdatePanel.tsx` y `MarketTable.tsx` como plantilla de referencia para cualquier componente interactivo nuevo.
- **Estados de carga y vacíos:** el patrón de "No disponible" en vez de omitir o inventar ya está bien establecido (`MarketTable`, `openMeteo.ts`) — extenderlo consistentemente a los nuevos indicadores de `estimated`/`observed`.
- **Confianza del usuario en presentación de probabilidades:** mantener el lenguaje ya usado ("la probabilidad no equivale a certeza") y reforzarlo específicamente en los mercados de conteo mientras H22 no esté resuelto, con un texto explícito tipo *"esta categoría usa una estimación general mientras integramos una fuente de datos más granular"*.


---

## 7. Recomendaciones backend, datos y proveedores

### 7.1 APIs y contratos
Las rutas de la API son consistentes, usan el estándar `application/problem+json` para errores, y separan correctamente lectura (GET, sin rate limit) de escritura (POST, con `requireSameOrigin` + rate limit). Única corrección necesaria: agregar la capa de autorización de la Sección 4.1 a las rutas de mutación sensibles.

### 7.2 Servicios y validaciones
La capa de servicios (`matchService`, `analysisService`, `historicalSignalService`) está bien separada de los proveedores y del motor de análisis — buena señal de mantenibilidad. La validación de entrada con Zod (`applyManualOverrides`, `schemas.ts`) es robusta y debe usarse como plantilla para cualquier endpoint de escritura futuro.

### 7.3 Normalización de datos y proveedores
- **Prioridad #1 en esta área:** resolver H22 decidiendo, por cada proveedor, qué hacer con los campos de conteo (shots/corners/cards/fouls/offsides):
  - Si el plan gratuito de API-Football sí expone estos campos (a confirmar contra la documentación real de la API y el plan contratado), completar la lectura real en `normalizeStats`, replicando el patrón defensivo ya usado en `footballdataIo.ts`.
  - Si no los expone, usar Footballdata.io como fuente preferida específicamente para estos campos cuando esté disponible, y marcar como `estimated`/`unavailable` (Sección 4.4) cuando la única fuente sea API-Football.
- **Elo:** implementar el servicio propuesto en la Sección 4.3, alimentado por el histórico ya importado.
- **Proveedores múltiples:** la arquitectura de adaptadores (`FootballProvider`, `OddsProvider`, etc.) ya está lista para escalar a más ligas; el esfuerzo real de expansión está en `competitionCatalog.ts` y `TeamVisual.tsx` (catálogos estáticos) — documentar el proceso de alta de una nueva competición/selección como una guía corta en `docs/guides`.

### 7.4 Almacenamiento
El modelo de datos en Prisma es sólido y ya anticipa necesidades reales (trazabilidad, backtesting, telemetría). Única mejora estructural sugerida: considerar migrar los campos `String` que almacenan JSON (H13) a `Json` nativo si en el futuro se necesita consultarlos directamente con SQL — no urgente hoy.

### 7.5 Caching
El diseño de TTL dinámico por proximidad al kickoff (`cachePolicy.ts`) y el uso de Postgres como almacén de snapshots (en vez de un servicio externo) son decisiones correctas para un entorno serverless y de bajo costo. Pendiente: job de limpieza (H17) y mover el bypass de caché (H53) a un control más estricto.

### 7.6 Actualización de datos y trazabilidad
El sistema de resolución de evidencia (`resolveEvidence.ts`) con prioridades entre fuentes (oficial > proveedor > manual > inferido) es de las piezas mejor diseñadas de todo el proyecto — no requiere cambios, solo extenderse (Sección 4.4) para cubrir también los mercados de conteo.

### 7.7 Manejo de fallos externos
El fallback en cascada entre proveedores con degradación a modo demo claramente etiquetado (`matchService.ts`) es un patrón de resiliencia correcto. Mejora menor: agregar 1-2 reintentos con backoff corto antes de pasar al siguiente proveedor (H25), para no descartar un proveedor válido por un error transitorio puntual.

---

## 8. Recomendaciones de testing QA

### 8.1 Pruebas unitarias
- **Acción inmediata:** agregar aserciones explícitas sobre `shots`, `shotsOnTarget`, `corners`, `cards`, `fouls`, `offsides` y `elo` en los tests de cada proveedor (`api-football.test.ts` y equivalentes), comparando contra los valores exactos del fixture simulado. Esto convierte a H22/H29 en un fallo de test inmediato y verificable, sirviendo como criterio objetivo de "arreglado" cuando se corrija.
- Agregar un test de "sensibilidad del modelo" (H76): construir dos datasets sintéticos con fuerza claramente distinta entre equipos (goles, forma, Elo si ya se implementó) y verificar que `analyzeMatch` produce probabilidades de victoria coherentemente distintas — no solo que sumen 100%.

### 8.2 Pruebas de integración
Ya existen 7 archivos cubriendo rutas API; agregar uno específico para `POST /api/match/[id]/overrides` que verifique que la ruta **rechaza** una solicitud sin el token de analista (una vez implementado H54) — un test que hoy no puede existir porque la protección no existe, y que debe agregarse como parte de la propia corrección.

### 8.3 Pruebas E2E
Cuando se corrija H60 (mensaje de Elo), actualizar `tests/e2e/core-flow.spec.ts` en la aserción que hoy espera ver el texto "Elo + logística" en la home — este test quedaría desactualizado si el mensaje cambia sin tocarlo.

### 8.4 Pruebas de datos y del modelo probabilístico
El backtesting (`run-backtest.ts`) ya cumple el rol de "prueba del modelo" contra datos reales con métricas correctas (Brier, log loss, RPS). Recomendación: agregar una prueba automatizada (no solo el script manual) que falle si el Brier score del último backtest supera un umbral aceptable — convirtiendo la validación estadística en parte del proceso de calidad, no solo en un reporte manual.

### 8.5 Pruebas de seguridad
Agregar un test que confirme que las rutas de mutación (`overrides`, `refresh`) sin origen válido (`requireSameOrigin`) son rechazadas — si no existe ya explícitamente, dado que `next-config.test.ts` ya prueba la CSP, sería natural extender esta disciplina a los guards de request.

### 8.6 Casos borde
Confirmar cobertura de: partido sin alineaciones confirmadas, partido sin cuotas disponibles (todos los proveedores fallan), fecha de búsqueda sin partidos, y el escenario de `DATABASE_URL` no disponible (para verificar que el modo `noop` no genera errores no controlados en cascada).

### 8.7 Checklist mínimo antes de producción
- [ ] Los 39 tests existentes pasan localmente (`npm test`, `npm run test:e2e`).
- [ ] CI configurado y verde (una vez implementado H77).
- [ ] Test nuevo de campos de proveedor (H75) en verde.
- [ ] Test nuevo de sensibilidad del modelo (H76) en verde.
- [ ] `smoke-production.ts` ejecutado manualmente contra el entorno de destino tras cada deploy, hasta automatizarlo.
- [ ] Verificación manual de que `POST /overrides` rechaza solicitudes sin token de analista, una vez implementado.


---

## 9. Recomendaciones de performance y costos

Todas las recomendaciones de esta sección priorizan opciones gratuitas o de bajo costo, coherente con el objetivo del proyecto.

| Área | Recomendación | Costo |
|---|---|---|
| Conexión a BD | Confirmar uso del endpoint *pooled* de Neon (`-pooler` en el host) en `DATABASE_URL` | Gratis (configuración) |
| Limpieza de datos | Job de limpieza de `MatchSnapshot` antiguos (H17) — ej. borrar snapshots con más de 30 días vía una Netlify Scheduled Function | Gratis (tier de Netlify) |
| Reducción de llamadas externas | Ya bien resuelto (caché con TTL dinámico, verificación de eventos antes de pedir odds); mantener este patrón al agregar nuevos proveedores | — |
| Hosting | Netlify + Neon en tiers gratuitos son adecuados para el volumen actual; revisar límites de Neon (almacenamiento, horas de cómputo) conforme crezca el tráfico | Gratis hasta el límite del tier |
| Base de datos | Migrar campos JSON-como-`String` (H13) solo si se necesita consultarlos con SQL — no urgente, evita trabajo prematuro | — |
| Jobs programados | Automatizar backtest (H82) y limpieza (H17) vía Netlify Scheduled Functions | Gratis (tier) |
| Límites de proveedores | La política de cuota (`apiQuotaPolicy`) ya protege bien esto; reforzarla con el límite "a ciegas" cuando la BD falle (H42) | Gratis (código) |
| Monitoreo básico | UptimeRobot o similar (tier gratuito) apuntando a `/api/health` | Gratis |
| CI | GitHub Actions (gratuito para repositorios públicos, y con minutos gratuitos generosos para privados pequeños) | Gratis en el volumen actual |

**No se identificó ningún gasto de infraestructura innecesario ni sobre-provisionado.** El diseño actual ya es consciente de costos; las recomendaciones de esta sección son de "cerrar huecos operativos", no de "reducir gasto existente".

---

## 10. Riesgos de seguridad

### 10.1 Resumen de riesgos activos
| Riesgo | Severidad | Estado |
|---|---|---|
| Escritura pública sin autorización (overrides) | P1 | Confirmado, ya documentado internamente por el equipo, sin implementar |
| Rate limiting no confiable en serverless | P1 | Confirmado |
| CSP con `unsafe-inline` en `script-src` | P2 | Confirmado |
| Bypass de caché en `refresh` técnicamente alcanzable | P2 | Confirmado, no expuesto en UI estándar |
| Fallback silencioso de BD (afecta también protección de cuota) | P1/P2 | Confirmado, parcialmente mitigado por endpoint de salud |

### 10.2 Exposición de secretos
No se encontró ningún secreto, clave o credencial expuesta en el código fuente ni en la configuración revisada. `.env.example` documenta únicamente nombres de variables. Los endpoints de diagnóstico (`/api/usage`, `/api/provider-status`) exponen solo booleanos y datos agregados, nunca valores de API keys — buena práctica confirmada.

### 10.3 Manejo de variables de entorno
Correcto: los scripts (`seed.ts`, `import-openfootball.ts`, `run-backtest.ts`) validan explícitamente que `DATABASE_URL` apunte a Postgres real antes de ejecutar operaciones destructivas o de escritura masiva.

### 10.4 Autenticación
**No existe ningún sistema de autenticación en el proyecto.** Esto es aceptable para las rutas de lectura pública (es un producto de consumo abierto), pero es la causa raíz de H54 para las rutas de escritura. Ver Sección 4.1 para el diseño mínimo propuesto.

### 10.5 Autorización
Inexistente más allá de `requireSameOrigin` (que protege contra CSRF cross-site, no contra un visitante legítimo del propio sitio actuando de mala fe). Ver Sección 4.1.

### 10.6 Validación de entradas
Fuerte: Zod se usa consistentemente en los puntos de entrada de datos de usuario (overrides), con reglas específicas por tipo de override.

### 10.7 CORS
No se encontró configuración explícita de CORS revisando `next.config.ts`; dado que las rutas API son consumidas por el propio frontend (same-origin), esto es coherente con el uso de `requireSameOrigin` como mecanismo principal de protección. Si en el futuro se planea exponer la API a terceros (ej. una app móvil o integración externa), se debe diseñar CORS explícitamente en ese momento.

### 10.8 Rate limiting
Ver H18 (Sección 3) y su remedio propuesto (Sección 4.2).

### 10.9 Dependencias
No se realizó un escaneo de vulnerabilidades de dependencias (`npm audit` o equivalente) como parte de esta auditoría de código estático; se recomienda ejecutarlo como parte del checklist antes de producción (Sección 12) y periódicamente, dado que las versiones del stack (Next.js 16, React 19, Prisma 7) son muy recientes.

### 10.10 Logs
No se encontró evidencia de un sistema de logging centralizado más allá de `console.warn`/`console.error` puntuales (ej. en el fallback de BD). Para un proyecto en esta etapa, esto es razonable, pero limita la capacidad de diagnóstico retroactivo ante un incidente. Recomendación de bajo costo: un servicio gratuito de logging (ej. tier gratuito de Sentry o Axiom) capturando al menos los `console.error` de rutas críticas (fallback de BD, fallos de proveedor en cascada completa).

### 10.11 Protección de datos
No se manejan datos personales de usuarios finales (no hay cuentas, no hay datos sensibles capturados) más allá de IPs usadas transitoriamente para rate limiting — bajo riesgo en esta dimensión.


---

## 11. Plan de implementación por fases

### Fase 1 — Correcciones críticas
**Objetivo:** cerrar los riesgos P1 de mayor exposición práctica (seguridad y credibilidad de producto).

| Tarea | Prioridad | Esfuerzo | Resultado esperado |
|---|---|---|---|
| Implementar `requireAnalyst` + token de analista en `POST /overrides` (Sección 4.1) | Máxima | Bajo-medio | Overrides ya no son públicos |
| Ajustar mensaje de "Elo" en home y `SourcesSection` mientras no esté implementado, o iniciar Fase 4 en paralelo | Máxima | Bajo | Elimina discrepancia de credibilidad inmediata |
| Configurar monitoreo externo gratuito de `/api/health` | Alta | Bajo | H09 deja de ser un riesgo silencioso |
| Agregar test que exponga H22/H29 (aserciones sobre campos de proveedor) | Alta | Bajo | Confirma el problema de forma objetiva antes de arreglarlo |
| Mover rate limiting de rutas de mutación a conteo persistente (Sección 4.2) | Alta | Medio | H18/H53 dejan de depender de memoria en frío |

### Fase 2 — Estabilización técnica
**Objetivo:** testing, estructura, validaciones, datos y seguridad base.

| Tarea | Prioridad | Esfuerzo | Resultado esperado |
|---|---|---|---|
| Configurar CI (GitHub Actions) ejecutando `npm test` en cada push/PR | Alta | Bajo-medio | Tests bloquean regresiones antes de producción |
| Confirmar/ajustar pooling de conexión Neon (H03) | Alta | Bajo | Reduce riesgo de agotamiento de conexiones |
| Migrar CSP de `unsafe-inline` a nonces (H10) | Media | Medio | Reduce superficie de XSS |
| Job de limpieza de `MatchSnapshot` (H17) | Media | Bajo | Controla crecimiento de almacenamiento |
| Límite conservador de cuota cuando la BD no esté disponible (H42) | Media | Medio | Evita doble falla silenciosa |

### Fase 3 — Mejora de producto y UX
**Objetivo:** interfaz, experiencia, confianza, claridad y navegación.

| Tarea | Prioridad | Esfuerzo | Resultado esperado |
|---|---|---|---|
| Corregir/eliminar las 7 subsecciones sin funcionalidad (H86, guía en Sección 6.1) | Alta | Medio (bajo por sección) | Navegación 100% funcional, sin clics "muertos" |
| Extender el dominio con `status: "observed"/"estimated"/"unavailable"` en estadísticas de conteo (Sección 4.4) | Alta | Medio | Base para arreglar H22, H34 y H67 a la vez |
| Etiqueta visual de datos estimados en `MarketTable` (H67) | Media | Bajo | Mayor transparencia percibida |
| Revisar ubicación del panel de salud detallado en la home (H71) | Baja | Bajo | Coherencia con "experiencia premium" |
| Actualizar fecha inicial dinámica del buscador (H64) | Baja | Bajo | Evita quedar desactualizado tras el Mundial 2026 |

### Fase 4 — Optimización del modelo y datos
**Objetivo:** backtesting, calibración, proveedores, métricas y trazabilidad.

| Tarea | Prioridad | Esfuerzo | Resultado esperado |
|---|---|---|---|
| Implementar servicio de Elo real (Sección 4.3) | Alta | Medio | Resuelve H29 de raíz; habilita revertir el mensaje de H60 con veracidad |
| Resolver la fuente real de datos de conteo (córners/tarjetas/faltas/disparos/offsides) por proveedor (H22) | Alta | Medio | Mercados dejan de ser idénticos entre partidos |
| Automatizar `run-backtest.ts` con Scheduled Functions (H82) | Media | Medio | Calibración se mantiene actualizada sin intervención manual |
| Agregar test de sensibilidad del modelo (H76) | Media | Bajo | Detecta regresiones futuras de tipo H29 |
| Recalibrar parámetro `rho` de Dixon-Coles contra datos propios (H38) | Baja | Medio | Ajuste fino de precisión, no urgente |

### Fase 5 — Escalabilidad y operación
**Objetivo:** performance, monitoreo, costos, despliegue y mantenimiento.

| Tarea | Prioridad | Esfuerzo | Resultado esperado |
|---|---|---|---|
| Documentar proceso de alta de nueva liga/selección (`competitionCatalog.ts`, `TeamVisual.tsx`) | Media | Bajo | Facilita la expansión declarada como objetivo de producto |
| Reintentos simples ante fallos transitorios de proveedores (H25) | Baja | Bajo | Mejora resiliencia sin costo adicional |
| Logging centralizado mínimo (Sección 10.10) | Baja | Bajo | Mejora diagnóstico ante incidentes futuros |
| Archivar migraciones legacy de SQLite (H84) | Baja | Bajo | Limpieza de repositorio |
| `npm audit` periódico de dependencias | Media | Bajo | Detecta vulnerabilidades en un stack muy reciente |

---

## 12. Checklist verificable

### Arquitectura
- [ ] Capa de autorización mínima (`src/lib/auth/`) implementada y aplicada a rutas de escritura sensibles
- [ ] Rate limiting movido a almacenamiento persistente
- [ ] Confirmado uso del endpoint *pooled* de Neon

### Frontend
- [ ] Las 7 subsecciones de H86 corregidas (funcionalidad real o navegación simplificada)
- [ ] `ConfidenceBadge` refleja honestamente qué tan medidos son sus componentes
- [ ] `MarketTable` distingue visualmente datos `observed` vs `estimated`
- [ ] Mensaje de "Elo" en home y Fuentes corregido o respaldado por implementación real

### Backend
- [ ] Todas las rutas de mutación protegidas por `requireSameOrigin` + autorización + rate limit persistente
- [ ] Reintentos ante fallos transitorios de proveedores implementados

### Base de datos
- [ ] Job de limpieza de `MatchSnapshot` configurado
- [ ] Límite conservador de cuota activo cuando la BD no esté disponible
- [ ] Campos JSON evaluados para migración a `Json` nativo (si aplica)

### Modelo probabilístico
- [ ] Servicio de Elo real implementado y conectado al motor de análisis
- [ ] Fuente real (o marcado explícito de estimación) para shots/corners/cards/fouls/offsides resuelta
- [ ] Test de sensibilidad del modelo (equipos de fuerza distinta → probabilidades distintas) en verde
- [ ] Backtest automatizado periódicamente

### Proveedores de datos
- [ ] Documentado el proceso de alta de nueva liga/selección
- [ ] Confirmada la fuente preferida por campo (goles vs. conteo vs. odds vs. clima)

### Seguridad
- [ ] CSP migrada de `unsafe-inline` a nonces
- [ ] `npm audit` ejecutado sin vulnerabilidades críticas abiertas
- [ ] Monitoreo externo de `/api/health` activo y alertando

### QA
- [ ] CI configurado y ejecutando `npm test` + `npm run test:e2e` en cada PR
- [ ] Tests actualizados para cubrir campos de proveedor (H75) y sensibilidad del modelo (H76)
- [ ] `smoke-production.ts` ejecutado (manual o automatizado) tras cada despliegue

### Performance
- [ ] Estrategia de caché revisada tras resolver H53 (bypass de caché)
- [ ] Límites de cuota de proveedores verificados contra el plan real contratado de cada uno

### Costos
- [ ] Confirmado que todas las nuevas automatizaciones (Scheduled Functions, CI, monitoreo) permanecen dentro de tiers gratuitos

### Despliegue
- [ ] `netlify.toml` actualizado para incluir paso de test si se decide bloquear deploys con tests fallidos
- [ ] Documentación de despliegue (`docs/deployment`) actualizada con la decisión de pooling de Neon

---

## Anexo — Índice completo de hallazgos (H01–H86)

Para trazabilidad completa con el proceso de auditoría por bloques, se listan todos los hallazgos identificados durante la revisión, incluyendo los ya resueltos/descartados durante el proceso:

**Resueltos o descartados durante la auditoría (no requieren acción):** H01, H02 (aclarados como diseño intencional de fallback Neon/Netlify), H48 (zona horaria confirmada como decisión de producto).

**P1 activos:** H09, H18, H22, H29, H34/H66, H54, H60, H75, H86.

**P2 activos:** H03, H10, H17, H25, H42, H53, H67, H76, H77, H82.

**P3 (menores/positivos, ver detalle en Sección 3):** H13, H23, H24, H26, H28, H31, H33/H74, H38, H64, H71, H84, y las fortalezas confirmadas H05, H07(descartado por evidencia posterior), H12, H14, H15, H16, H20, H21, H27, H30, H32, H35–H37, H39–H41, H43–H47, H49–H52, H55–H59, H61–H63, H65, H68–H70, H72–H73, H78–H81, H83, H85.

*(Los IDs "positivos"/fortalezas fueron incorporados a la Sección 2 de este informe y no requieren acción; se mantienen listados aquí únicamente para trazabilidad con la conversación de auditoría.)*

---

*Fin del informe. Documento generado a partir de una auditoría de código estático de 13 bloques más documentación interna del proyecto. No se ejecutó el código en un entorno productivo ni se accedió a credenciales o valores de variables de entorno reales.*
