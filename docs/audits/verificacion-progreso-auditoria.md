# Verificación de progreso — Auditoría técnica Analista Mundial Pro
### Informe dirigido al equipo/agente de desarrollo (Codex)
**Commit verificado:** `ef23d65` — *feat: harden analysis providers and evidence UX*
**Commit anterior auditado:** `bca23c4` — *estructura y organizacion*
**Metodología de esta verificación:** no se aceptó el autoreporte de progreso como válido por sí solo. Se hizo `git fetch`/`git pull` del repositorio real, se leyó el diff completo del commit (`33 files changed, 1286 insertions, 154 deletions`), se inspeccionó línea por línea cada archivo relevante a las afirmaciones de "completado", y se **ejecutó la suite de tests de forma independiente** (`npx vitest run`) para confirmar los números reportados, en vez de darlos por buenos.

**Resultado general:** el autoreporte de Codex es **honesto y, en al menos un punto (H34/H66), más conservador de lo que el código justifica**. No se encontró ningún caso de progreso maquillado, exagerado o marcado como "completado" sin evidencia real. Esto es una señal fuerte de buena disciplina de reporte, y se documenta explícitamente en este informe porque es tan relevante como los propios hallazgos técnicos.

---

## 1. Verificación independiente de la suite de tests

Se ejecutó la suite completa en un entorno limpio (después de `git pull`), sin depender del resultado que Codex reportó:

```
Test Files  43 passed | 4 skipped (47)
Tests       141 passed | 7 skipped (148)
Duration    56.42s
```

**Coincide exactamente** con el número reportado por Codex (141 passed, 7 skipped). Esto es un dato relevante: confirma que el pipeline local de Codex no está inflando ni omitiendo resultados al reportar hacia arriba.

**Limitaciones de esta verificación (transparencia metodológica):**
- No se pudo ejecutar `npm run test:e2e` en este entorno de auditoría porque no cuenta con un navegador Playwright instalado (restricción del sandbox de verificación, no del proyecto).
- `npx tsc --noEmit` arrojó errores, pero **todos son atribuibles a que el cliente de Prisma no pudo generarse** en este entorno (el sandbox de verificación tiene una lista blanca de dominios de red que no incluye el CDN de binarios de Prisma `binaries.prisma.sh`). Esto produce tipos `any` en cascada en todo lo que depende del cliente generado. **No se interpreta esto como evidencia en contra del reporte de Codex** — es una limitación del entorno de verificación, y se señala explícitamente para que no se malinterprete como un hallazgo nuevo.

**Recomendación para Codex:** sería valioso, en el próximo reporte de progreso, incluir el hash del commit exacto sobre el que se corrieron los tests (como se hizo esta vez: `ef23d65`) — permite que cualquier auditor externo reproduzca el resultado sin ambigüedad. Esta vez fue posible gracias a que el mensaje de commit y el hash estaban disponibles; mantenerlo como práctica estándar.

---

## 2. Hallazgos verificados como COMPLETADOS (con evidencia de código y nivel de calidad)

Para cada uno, se documenta no solo "sí se hizo" sino **qué tan bien se hizo**, desde una perspectiva de desarrollador senior — porque hay una diferencia real entre "cerrar un hallazgo" y "cerrarlo con buenas prácticas que no generan deuda técnica nueva".

### 2.1 — H54: Overrides sin autorización → **RESUELTO, calidad alta**

**Archivo:** `src/lib/auth/analyst.ts` (nuevo)

**Lo que se pidió en la auditoría original:** un token simple de analista vía variable de entorno, sin necesidad de un sistema de usuarios completo.

**Lo que se implementó, y por qué es mejor de lo mínimo pedido:**
```ts
function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
```
- Usa `timingSafeEqual` de `node:crypto` en vez de una comparación `===` directa de strings. Esto **previene ataques de temporización** (timing attacks), donde un atacante podría inferir el token carácter por carácter midiendo cuánto tarda la respuesta en fallar. Es un detalle de seguridad que va más allá de lo mínimo pedido — buena práctica de un desarrollador que piensa en el vector de ataque completo, no solo en "que funcione".
- **Falla cerrado, no abierto:** si `ANALYST_OVERRIDE_TOKEN` no está configurado en el entorno, la función retorna `503` ("Edición manual no configurada") en vez de dejar pasar la solicitud por defecto. Esto es exactamente el comportamiento correcto: un error de configuración nunca debe traducirse en una brecha de seguridad silenciosa.
- Soporta tanto un header custom (`x-analyst-token`) como el estándar `Authorization: Bearer <token>` — flexibilidad razonable sin sobre-ingeniería.

**Verificación de integración real (`src/app/api/match/[id]/overrides/route.ts`):**
```ts
const originProblem = requireSameOrigin(request);
if (originProblem) return originProblem;
const analystProblem = requireAnalyst(request);
if (analystProblem) return analystProblem;
const limitProblem = await checkPersistentRateLimit(...);
```
Orden correcto: origen → identidad → límite de frecuencia → validación de payload → lógica de negocio. Es el orden de capas que se espera en cualquier ruta de mutación bien diseñada (rechazar lo más barato de verificar primero).

**Nota para Codex, no un defecto sino un punto a decidir conscientemente:** el token es único y compartido (no hay distinción entre distintos analistas ni registro de auditoría de "quién" hizo cada override, más allá de la IP para rate limiting). Para el estadio actual del producto esto es aceptable y proporcional; si en el futuro se necesita saber *quién específicamente* hizo un cambio (para un caso de abuso o disputa), este es el punto donde el diseño de la Sección 3 de este informe (roles reales) se vuelve relevante — no es urgente hoy.

**Veredicto: H54 cerrado correctamente. No requiere más trabajo en el corto plazo.**

---

### 2.2 — H18 / H53: Rate limiting en memoria → **RESUELTO, calidad alta con un matiz importante**

**Archivos:** `src/lib/http/persistentRateLimit.ts` (nuevo), `prisma/migrations/20260706010000_persistent_rate_limit/migration.sql` (nuevo)

**Lo que se pidió:** mover el conteo a almacenamiento persistente, similar al patrón ya usado en `apiUsageService.ts`.

**Lo que se implementó — y aquí Codex superó claramente lo mínimo pedido:**
```sql
SELECT "count", "resetsAt" FROM "RateLimitBucket"
WHERE "scope" = $1 AND "clientKey" = $2 FOR UPDATE
```
El uso de `FOR UPDATE` dentro de una transacción (`database.$transaction(...)`) es la técnica correcta para hacer que el incremento del contador sea **atómico bajo concurrencia real**. Sin este lock de fila, dos invocaciones serverless simultáneas podrían leer el mismo `count`, incrementarlo cada una por su cuenta, y perder un incremento (clásica condición de carrera "read-modify-write"). Esto demuestra que quien implementó esto entendió el problema de fondo del entorno serverless (múltiples instancias concurrentes), no solo el síntoma ("el Map en memoria no persiste").

**Diseño defensivo adicional, bien pensado:**
```ts
const canUseDatabase =
  Boolean(database) || getDatabaseRuntimeStatus().status === "configured";
if (!canUseDatabase) {
  const fallback = checkRateLimit(request, scope, { limit, windowMs });
  fallback?.headers.set("x-ratelimit-storage", "memory-fallback");
  return fallback;
}
```
Si la base de datos no está disponible, cae de forma controlada al limitador en memoria original (en vez de fallar todas las solicitudes), y **etiqueta explícitamente la respuesta** con `x-ratelimit-storage: memory-fallback` para que sea observable qué modo estuvo activo. Esto es exactamente el tipo de "degradación observable" que se recomendó en la sección de arquitectura del informe original.

**Matiz importante que Codex debe tener en el radar (no es un defecto de esta implementación, es una interacción entre dos hallazgos):**
En el escenario específico de "la base de datos está caída" (H09), el rate limiting de las rutas de mutación **vuelve a depender de memoria** — es decir, la robustez de H18 y la disponibilidad de la base de datos (H09) están acopladas. Esto es aceptable como comportamiento de degradación (mejor que bloquear todo el tráfico), pero merece quedar documentado como una dependencia conocida, no simplemente asumido.

**Punto nuevo detectado durante esta verificación, no mencionado en el autoreporte:**
La tabla `RateLimitBucket` **no tiene ningún job de limpieza**, igual que `MatchSnapshot` (hallazgo H17 de la auditoría original, aún pendiente). La buena noticia es que la migración ya incluye el índice necesario para hacerlo barato:
```sql
CREATE INDEX "RateLimitBucket_resetsAt_idx" ON "RateLimitBucket"("resetsAt");
```
**Recomendación concreta:** cuando se implemente el job de limpieza de H17, incluir en la misma rutina un `DELETE FROM "RateLimitBucket" WHERE "resetsAt" < now() - interval '1 day'`. Es prácticamente gratis agregarlo ahora que el índice ya existe, y evita crear un H17-bis dentro de unos meses.

**Veredicto: H18/H53 cerrados correctamente, con un ítem de mantenimiento (limpieza de tabla) para sumar al backlog de H17, no un hallazgo nuevo aislado.**

---

### 2.3 — H75: Tests no cubrían campos de proveedor → **RESUELTO**

**Archivo:** `tests/unit/api-football.test.ts`

El test ahora mockea estadísticas **deliberadamente distintas entre el equipo local y el visitante** (96 tiros/8 partidos jugados = 12 promedio para el local, 64/8 = 8 para el visitante) y verifica los 6 campos exactos que estaban en el centro del problema original (`shots`, `shotsOnTarget`, `corners`, `cards`, `fouls`, `offsides`) con valores esperados distintos por lado:
```ts
expect(result.data?.home.shots).toBeCloseTo(12);
...
expect(result.data?.away.shots).toBeCloseTo(8);
```
Este es exactamente el tipo de test que **habría fallado con el código anterior** (donde ambos equipos recibían la misma constante 10.5) y que ahora sirve como red de seguridad real contra una regresión futura a ese mismo patrón.

**Veredicto: H75 cerrado correctamente. Es el tipo de test de "caracterización del bug" que se recomienda mantener indefinidamente, incluso después de resuelto el problema original — actúa como test de regresión permanente.**

---

### 2.4 — H22: Mercados secundarios con datos idénticos → **RESUELTO de forma sustantiva, no cosmética**

**Archivo:** `src/lib/providers/apiFootball.ts`

Este es el cambio más grande y más importante de todo el commit (217 líneas modificadas solo en este archivo). Se verificó línea por línea que **no es un parche superficial**.

**Antes (código auditado en la revisión original):**
```ts
shots: 10.5,          // constante fija, sin lectura real
corners: 4.5,
cards: 2.1,
```

**Ahora:**
```ts
function perGame(total: number | undefined, played: number, fallback: number) {
  return total !== undefined ? total / played : fallback;
}

shots: perGame(countTotals.shots, played, 10.5),
corners: perGame(countTotals.corners, played, 4.5),
cards: perGame(countTotals.cards, played, 2.1),
```
Y `countTotals` viene de `extractCountTotals()`, que intenta **hasta 6 variantes distintas de nombre de campo** por estadística (ej. para `shots`: `shots.total`, `shots.total.total`, `shots_for.total`, `shotsFor.total`, `total_shots`, `shotsTotal`, además de un formato alternativo de array `statisticArrayValue`). Esto replica exactamente el patrón defensivo que ya existía en `footballdataIo.ts` y que se señaló en la auditoría original como "el patrón correcto que el proyecto ya sabe hacer, solo faltaba aplicarlo aquí también". Confirmado: se aplicó.

**El fallback constante ahora es un último recurso genuino, no el único camino.**

**Transparencia de evidencia — este es el detalle que eleva la calidad de la solución:**
```ts
const hasProviderCountStats =
  hasDetailedCountStats(homeStats) || hasDetailedCountStats(awayStats);
...
status: hasProviderCountStats ? "confirmed" : "expected",
detail: hasProviderCountStats
  ? "Goles, resultados y conteos disponibles normalizados por partido."
  : "Goles y resultados del torneo; conteos no cubiertos usan priors explícitos.",
```
No solo se corrigió la lectura del dato — se instrumentó el sistema para que **declare honestamente** cuándo está usando un prior en vez de un dato real, a través del mismo sistema de `SourceRecord`/`evidenceStatus` que ya existía en el dominio. Esto es exactamente la recomendación de arquitectura "marcar dato real vs. estimado" que se propuso en el informe original, y se integró usando la infraestructura ya existente en vez de crear un mecanismo paralelo — buena decisión de reutilización.

**Veredicto: H22 cerrado con una solución robusta, no un parche. El único trabajo pendiente relacionado es de producto/config, no de código: confirmar contra la documentación real del plan de API-Football contratado si el proveedor efectivamente expone estos campos para la mayoría de los partidos, o si en la práctica se seguirá cayendo a "expected" con frecuencia — eso ya no es un bug, es una característica del plan de datos contratado.**

---

### 2.5 — H67: MarketTable sin evidencia visual → **RESUELTO, con test dedicado**

**Archivos:** `src/components/analysis/MarketTable.tsx`, `tests/unit/market-table.test.tsx` (nuevo)

```ts
className={`evidence-pill evidence-pill-${prediction.evidenceStatus}`}
title={evidenceDescriptions[prediction.evidenceStatus]}
```
Cada fila de la tabla de mercados ahora muestra una etiqueta visual (`Confirmado`/`Estimado`/`Inferido`/`No disponible`) derivada directamente del mismo campo `evidenceStatus` que se corrigió en 2.4. El test nuevo verifica explícitamente las tres variantes de estado y su texto exacto — buena cobertura, no solo "renderiza sin crashear".

**Veredicto: H67 cerrado correctamente, y correctamente enganchado a la fuente de verdad de H22 (no es una etiqueta hardcodeada independiente).**

---

### 2.6 — H60: Promesa de Elo en el mensaje de producto → **RESUELTO, consistente en todas las superficies**

Se buscó la palabra "Elo" como palabra completa (no como substring de "modelo") en los tres lugares donde se había detectado la promesa original:
```
grep -n -iE "\bElo\b" src/app/page.tsx src/components/analysis/sections/SourcesSection.tsx \
  src/app/docs/provider-setup/page.tsx tests/e2e/core-flow.spec.ts
→ sin resultados
```
El texto "Elo + logística" en el hero de la home se reemplazó por **"Forma + logística"** — que sí corresponde honestamente a lo que el motor usa hoy (forma reciente ponderada + regresión logística, sin Elo). El test E2E se actualizó en el mismo commit para no quedar verificando un texto que ya no existe:
```ts
await expect(page.getByText("Forma + logística")).toBeVisible();
```

**Veredicto: H60 cerrado de forma limpia y consistente — mensaje de producto, componente de UI y test E2E quedaron sincronizados en el mismo commit. Esto es exactamente cómo debe manejarse un cambio de este tipo (no dejar el test desactualizado como deuda oculta).**

---

## 3. Hallazgo verificado como MÁS RESUELTO de lo que el propio reporte admite

### H34 / H66 — Confianza con componentes constantes y guardrail inutilizado

El autoreporte de Codex lo marca como **"Parcial"**, con el comentario: *"Ya baja confianza si stats base son estimadas; falta medir mejor frescura/estabilidad real."* Esto es cierto, pero subestima el trabajo ya hecho en la primera mitad del problema.

**Lo que se verificó en `src/lib/analysis/analysisEngine.ts`:**

```ts
function isBaseStatsSource(source: SourceRecord) {
  const haystack = `${source.id} ${source.label} ${source.detail}`.toLowerCase();
  return haystack.includes("team-stats") || haystack.includes("stats") ||
         haystack.includes("estad") || haystack.includes("hist") || haystack.includes("form");
}

function hasReliableBaseStats(dataset: MatchDataset) {
  const numericStatsPresent = [/* shots, goalsFor, etc. */].every(isFinitePositive);
  if (!numericStatsPresent) return false;

  return dataset.sources.some(
    (source) => isBaseStatsSource(source) &&
      (source.status === "confirmed" || source.status === "inferred"),
  );
}
```

El guardrail original (auditado en la revisión previa) solo comprobaba `Boolean(dataset.home.shots && dataset.away.shots)` — que **siempre era verdadero** porque incluso el valor de relleno (10.5) es un número "truthy". Ese era el defecto real señalado en la auditoría original.

**La nueva versión ya no tiene ese defecto.** Ahora exige, además del valor numérico, que exista una fuente (`SourceRecord`) marcada explícitamente como `"confirmed"` — y esa fuente **solo se marca `"confirmed"` cuando `hasDetailedCountStats()` encontró un valor real** (no `undefined`) antes de aplicar el prior (ver sección 2.4). Si se usó el prior, la fuente queda como `"expected"`, que **no** satisface la condición del guardrail. Es decir: **para los mercados donde H22 todavía cae al prior, la confianza sí se topa correctamente en 4/10, tal como se pidió originalmente.**

**Lo que sigue genuinamente sin resolver, y aquí el autoreporte de Codex es preciso:**
```ts
coverage: dataset.players.length ? 0.88 : 0.7,
freshness: 0.87,          // constante literal
modelStability: 0.82,     // constante literal
```
`freshness` (frescura del dato) y `modelStability` (estabilidad del modelo) siguen siendo literales fijos, no mediciones reales. Esta es la parte correcta y honesta de "Parcial" en el reporte.

**Recomendación concreta para cerrar esto del todo (ver también Sección 4):**
- `freshness` podría calcularse realmente a partir de `observedAt` de las fuentes más recientes vs. el momento del kickoff (dato que ya existe en cada `SourceRecord`) — no requiere nueva infraestructura, solo una función de mapeo tiempo→score.
- `modelStability` es más difícil de medir "en caliente"; una aproximación razonable de bajo esfuerzo sería compararlo contra la varianza de las últimas N ejecuciones del backtest (`CalibrationRun`, que ya se persiste) en vez de un valor fijo.

**Veredicto: la mitad "guardrail contra datos fabricados" de H34/H66 está genuinamente resuelta y verificada con evidencia de código — recomiendo a Codex actualizar su propio registro interno de este hallazgo de "Parcial" a "Parcial (base-stats guardrail resuelto; frescura/estabilidad aún pendiente)" para reflejar con precisión cuánto trabajo queda.**

---

## 4. Hallazgo verificado como PARCIAL, tal como se reporta (sin sorpresas)

### H09 — Fallback silencioso de base de datos

Confirmado en `overrides/route.ts`:
```ts
const databaseRuntime = getDatabaseRuntimeStatus();
if (databaseRuntime.status !== "configured") {
  return problem(503, "Persistencia no configurada", ...);
}
```
La ruta de escritura de overrides reales ahora falla explícitamente si no hay base de datos, en vez de fingir éxito. **Esto es correcto y suficiente para esa ruta específica.**

Lo que Codex reporta correctamente como pendiente: el cliente `noop` de `src/lib/db/prisma.ts` sigue existiendo para las rutas de lectura/demo/build. Esto es, en sí mismo, una decisión de diseño válida (permite que la app funcione en modo demo sin BD configurada, útil para desarrollo local y para no romper el build), **pero la auditoría original señalaba un riesgo específico: que este modo pudiera activarse en producción sin que nadie lo note.** Ese riesgo específico ya está parcialmente cerrado por capas anteriores (endpoint `/api/health`, `HealthPanel` público, `smoke-production.ts`), pero sigue dependiendo de que alguien monitoree esas señales activamente — no hay nada nuevo en este commit que lo cierre del todo, y es correcto que Codex no lo reclame como resuelto.

**Recomendación:** la decisión pendiente no es técnica, es de producto: ¿el modo demo debe seguir existiendo en producción bajo cualquier circunstancia, o solo en desarrollo/build? Si la respuesta es "solo en desarrollo", la corrección es agregar una comprobación de entorno (`NODE_ENV`/`CONTEXT` de Netlify) que impida el modo `noop` específicamente cuando `CONTEXT === "production"`, fallando de forma explícita y ruidosa en su lugar. Esto cerraría H09 por completo sin sacrificar la comodidad del modo demo en local.

---

## 5. Hallazgos verificados como GENUINAMENTE PENDIENTES (sin progreso oculto ni parcial)

Se verificó explícitamente que **no hay ningún avance silencioso** en estos tres puntos, para que Codex tenga certeza de que su propio backlog está bien priorizado y no hay trabajo ya hecho que no se está reportando (lo cual también sería un problema de trazabilidad si ocurriera).

### H29 — Elo real
```ts
home: normalizeStats(homeStats, 1500),
away: normalizeStats(awayStats, 1500),
```
**Confirmado: el Elo sigue siendo la constante 1500 para ambos equipos**, exactamente como en la revisión anterior. Se retiró la promesa de marketing (H60), pero el motor de Elo en sí **no existe todavía**. Esto es coherente con lo que Codex reporta ("solo dejamos de prometerlo").

### H86 — Subsecciones sin funcionalidad diferenciada
Se revisaron directamente los 6 componentes marcados como rotos en la auditoría original:
```
ContextSection.tsx  → title={`Contexto · ${subsection}`}     (solo título)
TacticsSection.tsx  → title={`Táctica · ${subsection}`}      (solo título)
KeepersSection.tsx  → title={`Porteros · ${subsection}`}      (solo título)
AlertsSection.tsx   → title={`Alertas · ${subsection}`}       (solo título)
SourcesSection.tsx  → title={`Fuentes · ${subsection}`}       (solo título)
SquadsSection.tsx   → title={`Plantillas · ${subsection}`}    (solo título)
```
**Ninguno filtra contenido real por subsección.** Nota importante para Codex: `SquadsSection.tsx` tuvo un cambio de 159 líneas en este mismo commit (parte de "robustecer alineaciones y bajas"), pero ese cambio es sobre la calidad del parseo de datos de bajas/lesiones, no sobre el filtrado por subsección — conviene que quede explícito en el backlog interno para que nadie asuma, al ver el diff grande, que H86 avanzó ahí también.

### H77 — CI/CD
```
find . -iname "*.yml" -o -iname "*.yaml" | grep -v node_modules
→ (sin resultados)
```
Confirmado: sigue sin existir ningún workflow de GitHub Actions ni configuración de CI equivalente. Las validaciones (`npm test`, `npm run build`, `npm run test:e2e`, lint, typecheck, db status, secret scan) siguen siendo, según el propio reporte, un checklist manual antes de cada push. Esto es coherente y no hay indicios de progreso oculto.

---

## 6. Marcador actualizado (perspectiva de auditor externo, no autoreporte)

| Categoría | Estado según Codex | Estado verificado por auditoría externa | Diferencia |
|---|---|---|---|
| H54 (overrides sin auth) | Completado | **Completado, calidad alta** | Ninguna — incluso mejor implementado de lo mínimo pedido |
| H18 (rate limit memoria) | Completado | **Completado, calidad alta** | Ninguna — con un ítem de mantenimiento nuevo detectado (limpieza de `RateLimitBucket`) |
| H53 (refresh force débil) | Completado indirecto | **Completado** | Ninguna |
| H75 (tests sin cobertura) | Completado | **Completado** | Ninguna |
| H67 (MarketTable sin evidencia) | Completado | **Completado** | Ninguna |
| H60 (promesa de Elo) | Mitigado | **Mitigado, consistente en 3 superficies** | Ninguna |
| H22 (mercados repetidos) | Parcial alto | **Resuelto de forma sustantiva** | Codex es preciso; "parcial alto" es razonable dado que depende del plan real de API-Football |
| H34/H66 (confianza inflada) | Parcial | **Guardrail de stats base resuelto; frescura/estabilidad pendiente** | Codex subestima ligeramente el avance real |
| H09 (fallback silencioso BD) | Parcial | **Parcial, exactamente como se reporta** | Ninguna |
| H29 (Elo real) | Pendiente | **Genuinamente pendiente** | Ninguna |
| H86 (subsecciones decorativas) | Pendiente | **Genuinamente pendiente** | Ninguna |
| H77 (CI) | Pendiente | **Genuinamente pendiente** | Ninguna |

**Conclusión de esta sección: el autoreporte de Codex tiene una precisión verificada del ~100% frente al código real, con un sesgo leve hacia la subestimación (no hacia la sobreestimación) en un caso (H34/H66).** Esto es exactamente el tipo de disciplina de reporte que se busca en un equipo de ingeniería serio: es preferible pecar de conservador que de optimista al reportar progreso.

---

## 7. Recomendaciones concretas para la siguiente iteración (ordenadas por relación esfuerzo/impacto)

### 7.1 Prioridad inmediata — barato y de alto impacto de percepción

**H86 — Arreglar subsecciones, sección por sección, en el orden sugerido por facilidad real de implementación:**

1. **`TacticsSection.tsx`** (el más fácil): las 4 tarjetas tácticas (`Plan ofensivo`, `Plan defensivo`, `Duelos`, `Ajustes 2T`) ya existen como bloques JSX separados. Cambio sugerido:
   ```ts
   {subsection === "Plan ofensivo" && <TacticalCard {...offensiveData} />}
   {subsection === "Plan defensivo" && <TacticalCard {...defensiveData} />}
   // etc.
   ```
2. **`SourcesSection.tsx`**: los 3 bloques (`SourceLedger`, `quality-strip`, `methodology`) también ya están separados en el JSX — mismo patrón de condicional.
3. **`SquadsSection.tsx`** (el más valioso, dato ya disponible): `dataset.availability` ya tiene `item.type` (`injured`/`suspended`/etc.) — filtrar con:
   ```ts
   const filtered = subsection === "Lesionados"
     ? dataset.availability.filter((item) => item.type === "injured")
     : subsection === "Suspendidos"
       ? dataset.availability.filter((item) => item.type === "suspended")
       : dataset.availability;
   ```
4. **`KeepersSection.tsx`**: condicionar qué `<dt>/<dd>` se muestra (`cleanSheet`/`saves`/`risk`) según `subsection` — los 3 datos ya están calculados por separado.
5. **`ContextSection.tsx`**: filtrar el array `rows` por una categoría — requiere revisar si `rows` ya tiene un campo de categoría implícito en su estructura o si hay que agregarlo (menor esfuerzo de investigación antes de codificar).
6. **`AlertsSection.tsx`** (el único que requiere tocar el motor de análisis primero): `analysis.alerts` no tiene campo de categoría todavía. Se necesita agregar `category: "lineup" | "weather" | "referee" | "odds-movement" | "pre-match"` en `analysisEngine.ts` antes de poder filtrar en el componente. Priorizar al final de este grupo por ser el único que no es "solo frontend".
7. **`SummarySection.tsx`**: no requiere filtrado — la recomendación aquí es **eliminar la subdivisión** en la navegación de `AnalysisCabin.tsx`, dejándolo como una sola vista continua, ya que fragmentar Panorama/Probabilidades/Escenarios/Confianza no aporta claridad real.

**`PlayersSection.tsx` (ya funcional, pero frágil):** agregar explícitamente `Disparos: "shots"` al objeto `SORT_KEYS` en vez de depender del valor por defecto implícito — 1 línea, elimina un acoplamiento no documentado.

### 7.2 Prioridad alta — protege todo el trabajo futuro

**H77 — CI mínimo viable.** Sugerencia concreta de archivo (gratuito en GitHub Actions para este tipo de repositorio):
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
```
No es necesario incluir `test:e2e` en esta primera versión de CI (requiere levantar un servidor y navegadores, más costoso de mantener en Actions) — se puede agregar como job separado más adelante. Empezar con lint + typecheck + unit/integration + build ya bloquea la gran mayoría de regresiones con el menor esfuerzo de configuración.

### 7.3 Prioridad media-alta — el trabajo más costoso, pero ya bien delimitado

**H29 — Servicio de Elo real.** El punto de enganche natural ya existe: `historicalSignalService.ts` ya ingiere cada partido finalizado. Sugerencia de estructura (ya propuesta en el informe original, se reitera aquí porque sigue siendo válida):
```
src/lib/rating/
  ├── eloEngine.ts        # fórmula pura: expectedScore + actualización K-factor
  ├── eloRepository.ts    # lectura/escritura del rating actual por equipo
  └── eloBackfill.ts      # inicialización desde el histórico ya importado (OpenFootball)
```
El campo `opponentElo` de `HistoricalTeamMatch` ya existe en el esquema de Prisma — no requiere migración nueva, solo empezar a escribirlo.

### 7.4 Prioridad media — cierra el guardrail de confianza al 100%

**H34/H66 segunda mitad** — dos sugerencias concretas de bajo esfuerzo:
- `freshness`: calcular a partir de `observedAt` de las fuentes (dato ya existente) vs. tiempo al kickoff, en vez de `0.87` fijo.
- `modelStability`: aproximar con la varianza de los últimos N registros de `CalibrationRun` (ya se persiste vía `run-backtest.ts`) en vez de `0.82` fijo.

### 7.5 Prioridad media — mantenimiento de datos

- Job de limpieza combinado para `MatchSnapshot` (H17) **y** `RateLimitBucket` (nuevo, detectado en esta verificación) — ambos ya tienen los índices necesarios (`resetsAt`) para hacerlo barato.
- Automatizar `run-backtest.ts` (H82) vía Netlify Scheduled Functions.

### 7.6 Prioridad media — seguridad frontend

- H10 (CSP `unsafe-inline`): migrar a nonces soportados nativamente por Next.js App Router. Requiere cuidado con Netlify (confirmar que el adaptador `@netlify/plugin-nextjs` propaga correctamente los nonces generados por Next en cada request) — por eso Codex lo marca con razón como algo que "puede requerir cuidado", vale la pena probarlo primero en un entorno de staging si existe, o con una bandera de feature antes de aplicarlo global.

---

## 8. Observación general sobre el proceso (para ambos: Codex y el owner del proyecto)

Este ciclo de verificación confirma algo importante sobre la forma de trabajo: **el reporte de progreso de Codex fue verificable y resultó ser preciso.** Esto vale la pena reconocerlo explícitamente porque no es el resultado por defecto cuando un agente autoreporta su propio trabajo — es común (en agentes de IA y en desarrolladores humanos por igual) sobreestimar cuánto se resolvió, especialmente en hallazgos con matices como H34/H66. Aquí ocurrió lo contrario.

**Recomendación de proceso hacia adelante:** mantener esta misma disciplina — reportar con evidencia verificable (rutas de archivo, líneas, resultados de test reproducibles con el hash del commit) — y considerar que una auditoría externa periódica (como esta) siga corriendo `npx vitest run` de forma independiente en cada punto de control, no solo leyendo el reporte, como parte del propio proceso de validación cruzada antes de dar por cerrado un hallazgo P1.

---

*Fin del informe de verificación. Basado en lectura directa del commit `ef23d65` y ejecución independiente de la suite de tests. No se ejecutó código en el entorno de producción ni se accedió a credenciales reales.*
