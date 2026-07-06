# Auditoría Externa con Claude Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar una revisión externa segura del proyecto Analista Mundial Pro con Claude, recibir un diagnóstico senior y convertirlo en un backlog implementable.

**Architecture:** La auditoría se divide en tres fases: preparar contexto sanitizado, solicitar a Claude una revisión estructurada y transformar su respuesta en un plan técnico verificable. El repositorio no debe compartirse con secretos, archivos generados pesados ni datos privados.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, Neon Postgres, Netlify, Vitest, Playwright, proveedores deportivos externos.

---

## Principios de seguridad para la auditoría

Claude puede revisar arquitectura, UI, lógica, tests y estructura, pero no debe recibir:

- `.env`, `.env.local`, `.env.production`, `.env.*`
- API keys de API-Football, TheSportsDB, Football-Data, Footballdata.io, Odds API, Neon, Netlify o GitHub
- URLs completas de conexión a Neon/Postgres
- Tokens de deploy, tokens personales o cookies
- Directorios `node_modules`, `.next`, `playwright-report`, `test-results`, `.git`
- Dumps de base de datos con datos sensibles

Si se necesita mostrar configuración, usar únicamente archivos de ejemplo como `.env.example` y reemplazar valores por nombres descriptivos:

```env
API_FOOTBALL_KEY=REDACTED_API_FOOTBALL_KEY
DATABASE_URL=REDACTED_NEON_DATABASE_URL
ODDS_API_KEY=REDACTED_ODDS_API_KEY
```

## Fase 1: Preparar paquete de auditoría

### Task 1: Generar inventario técnico local

**Files:**
- Read: `package.json`
- Read: `next.config.*`
- Read: `prisma/schema.prisma`
- Read: `src/lib/**`
- Read: `src/components/**`
- Read: `src/app/**`
- Read: `tests/**`
- Read: `docs/**`
- Do not include: `.env*`, `.git/**`, `node_modules/**`, `.next/**`

- [ ] **Step 1: Revisar estado del repositorio**

Run:

```powershell
git status --short
```

Expected: lista de cambios pendientes. No hacer commit, push ni deploy en esta fase.

- [ ] **Step 2: Revisar scripts disponibles**

Run:

```powershell
Get-Content -Path package.json
```

Expected: confirmar scripts `build`, `lint`, `test`, `test:e2e`, `db:*`.

- [ ] **Step 3: Revisar estructura de alto nivel**

Run:

```powershell
Get-ChildItem -Name
```

Expected: confirmar carpetas principales como `src`, `tests`, `prisma`, `docs`, `scripts`.

### Task 2: Crear resumen de contexto para Claude

**Files:**
- Create: `docs/audits/claude/2026-07-06-contexto-proyecto.md`

- [ ] **Step 1: Crear documento de contexto**

Create `docs/audits/claude/2026-07-06-contexto-proyecto.md` with:

```markdown
# Contexto para auditoría externa - Analista Mundial Pro

## Objetivo del producto

Analista Mundial Pro es una aplicación web de análisis futbolístico para partidos, inicialmente orientada al Mundial 2026, pero diseñada para extenderse a ligas europeas, Champions League y otros torneos atractivos.

## Objetivo técnico

Construir una plataforma gratuita, robusta y extensible que combine datos de múltiples proveedores, histórico deportivo, cuotas, alineaciones, probabilidad, backtesting, calibración y una UI premium clara para usuarios finales.

## Stack actual

- Next.js 16
- React 19
- TypeScript
- Prisma 7
- Neon Postgres
- Netlify
- Vitest
- Playwright
- API-Football
- TheSportsDB
- Football-Data
- Footballdata.io
- The Odds API
- OpenFootball/worldcup.json y football.json como contexto histórico abierto

## Áreas críticas para revisar

1. Arquitectura frontend y navegación.
2. Arquitectura backend/API routes.
3. Modelo de datos Prisma/Neon.
4. Motor de análisis: Poisson, probabilidades, calibración, forma histórica, odds, value betting.
5. Normalización multi-proveedor.
6. Manejo de cuotas y límites gratuitos de APIs.
7. Manejo de fechas y timezone America/Bogota.
8. UI/UX premium, legibilidad, jerarquía visual y flujo.
9. Alineaciones: confirmadas, oficiales parciales, esperadas y no disponibles.
10. Testing unitario, integración y e2e.
11. Performance, caching y costos en Netlify.
12. Seguridad: secretos, tokens, endpoints, exposición de datos.
13. Clean code, acoplamiento, duplicación y mantenibilidad.
14. Roadmap de mejoras priorizadas.

## Restricciones actuales

- No hacer deploy automático durante auditoría.
- No compartir secretos.
- Netlify está limitado por consumo de créditos.
- Las pruebas locales son preferibles antes de cualquier commit grande.
- El producto debe seguir siendo viable en planes gratuitos o de bajo costo.

## Salida esperada de Claude

Claude debe devolver:

1. Diagnóstico ejecutivo.
2. Hallazgos por severidad: P0, P1, P2, P3.
3. Riesgos técnicos y de producto.
4. Recomendaciones de arquitectura.
5. Recomendaciones frontend/UI/UX.
6. Recomendaciones backend/datos/modelos.
7. Recomendaciones estadísticas/probabilísticas.
8. Recomendaciones de testing y QA.
9. Recomendaciones de performance/costos.
10. Plan de implementación por fases.
11. Checklist verificable.
12. Preguntas abiertas.
```

- [ ] **Step 2: Verificar que el documento no contiene secretos**

Run:

```powershell
Select-String -Path docs/audits/claude/2026-07-06-contexto-proyecto.md -Pattern "key|token|secret|DATABASE_URL|sk-|fd_|api_" -CaseSensitive:$false
```

Expected: solo aparecen nombres genéricos o referencias redactadas, nunca valores reales.

## Fase 2: Prompt maestro para Claude

### Task 3: Crear prompt de auditoría para Claude

**Files:**
- Create: `docs/audits/claude/2026-07-06-prompt-auditoria.md`

- [ ] **Step 1: Crear prompt maestro**

Create `docs/audits/claude/2026-07-06-prompt-auditoria.md` with:

```markdown
# Prompt para Claude - Auditoría Senior de Analista Mundial Pro

Actúa como arquitecto senior full-stack, QA senior, especialista en producto SaaS deportivo, frontend senior UI/UX, backend/data engineer y revisor de seguridad.

Necesito que audites este proyecto de forma rigurosa. No quiero una opinión superficial. Quiero un diagnóstico accionable, priorizado y verificable.

## Contexto

El proyecto se llama Analista Mundial Pro. Es una aplicación web para análisis futbolístico basada en datos reales, pensada inicialmente para Mundial 2026, pero extensible a ligas europeas, Champions League y otros torneos.

La app usa Next.js, React, TypeScript, Prisma, Neon Postgres, Netlify, Vitest, Playwright y múltiples proveedores deportivos. Integra API-Football, TheSportsDB, Football-Data, Footballdata.io, The Odds API y datasets abiertos de OpenFootball.

El objetivo es una app gratuita o de bajo costo con calidad premium: análisis profundo, UI clara, cálculos explicables, robustez en datos incompletos y buen control de costos.

## Qué debes revisar

Revisa:

1. Arquitectura general del proyecto.
2. Separación de responsabilidades.
3. Calidad del modelo de datos y Prisma.
4. Integración con proveedores deportivos.
5. Normalizadores y manejo de datos incompletos.
6. Motor de análisis probabilístico.
7. Uso de histórico, forma reciente, fuerza del rival, calibración, backtesting.
8. Uso de cuotas, value betting, surebets y mercados.
9. Alineaciones confirmadas, oficiales parciales, esperadas y no disponibles.
10. UI/UX, navegación, legibilidad, diseño premium y claridad del análisis.
11. Manejo de timezones, especialmente America/Bogota.
12. Tests unitarios, integración y e2e.
13. Performance, caching, Netlify y control de costos.
14. Seguridad de secretos y endpoints.
15. Clean code, duplicación, deuda técnica y mantenibilidad.
16. Riesgos para producción.

## Cómo quiero la respuesta

Devuelve la respuesta con esta estructura exacta:

### 1. Diagnóstico ejecutivo

Resume el estado real del proyecto en máximo 10 puntos.

### 2. Fortalezas

Lista lo que ya está bien diseñado o bien encaminado.

### 3. Hallazgos críticos por severidad

Usa:

- P0: rompe producción, seguridad o datos críticos.
- P1: afecta funcionamiento importante o confiabilidad.
- P2: deuda técnica o UX importante.
- P3: mejoras deseables.

Para cada hallazgo incluye:

- Título.
- Severidad.
- Evidencia en archivos o patrones.
- Impacto.
- Recomendación.
- Cómo verificar la corrección.

### 4. Arquitectura recomendada

Propón una arquitectura objetivo realista, sin sobrediseñar. Debe poder mantenerse en plan gratuito o bajo costo.

### 5. Revisión del motor estadístico

Evalúa si la lógica de probabilidades parece suficientemente contextual o si hay riesgo de porcentajes repetidos/genéricos. Recomienda mejoras para Poisson, forma reciente, histórico, odds, calibración, Brier Score, Log Loss y RPS.

### 6. Revisión UI/UX

Evalúa si la UI se siente premium, clara y útil. Sugiere mejoras concretas por pantalla/sección.

### 7. Revisión de datos y proveedores

Evalúa cómo deberían usarse los proveedores reales, fallback, cache, límites gratuitos, normalización, logos, escudos, banderas y enriquecimiento histórico.

### 8. Revisión de testing

Indica qué pruebas faltan, cuáles sobran, cuáles deben reforzarse y qué matriz QA recomiendas.

### 9. Performance y costos

Recomienda caching, reducción de llamadas, estrategia Netlify, Neon y APIs gratuitas.

### 10. Seguridad

Busca riesgos típicos de exposición de secrets, abuso de endpoints, logging sensible, validación de input y rate limits.

### 11. Plan de implementación priorizado

Divide en fases:

- Fase 1: P0/P1 obligatorios.
- Fase 2: estabilidad y QA.
- Fase 3: mejora de análisis.
- Fase 4: UI/UX premium.
- Fase 5: optimización de costos/performance.

Para cada tarea incluye:

- Objetivo.
- Archivos probables.
- Riesgo.
- Pruebas necesarias.
- Criterio de terminado.

### 12. Preguntas abiertas

Lista decisiones que debería tomar el dueño del producto antes de implementar.

## Reglas

- No pidas secretos.
- No sugieras servicios pagos como primera opción.
- Prioriza soluciones pragmáticas.
- No recomiendes scraping agresivo ni frágil como base principal.
- Si recomiendas scraping, que sea solo para fuentes permitidas, con respeto a robots.txt, términos de uso, cache y baja frecuencia.
- No propongas reescribir todo desde cero salvo que haya una razón muy fuerte.
- Señala duplicaciones, abstracciones prematuras y acoplamientos.
- Distingue claramente entre bugs, deuda técnica y mejoras de producto.
```

- [ ] **Step 2: Verificar que el prompt pide una salida accionable**

Run:

```powershell
Select-String -Path docs/audits/claude/2026-07-06-prompt-auditoria.md -Pattern "Cómo verificar|Criterio de terminado|Pruebas necesarias|Severidad"
```

Expected: aparecen las secciones que obligan a Claude a entregar hallazgos verificables.

## Fase 3: Formas de entregar el proyecto a Claude

### Task 4: Opción A - Claude Web o Claude Projects

**Files:**
- Use: `docs/audits/claude/2026-07-06-contexto-proyecto.md`
- Use: `docs/audits/claude/2026-07-06-prompt-auditoria.md`

- [ ] **Step 1: Subir un paquete sanitizado**

Subir a Claude solo archivos de código y documentación. Excluir:

```text
.env
.env.local
.env.production
.env.*
.git
node_modules
.next
playwright-report
test-results
coverage
data/openfootball/*.json si el archivo es demasiado grande
```

- [ ] **Step 2: Pegar el prompt maestro**

Pegar el contenido de `docs/audits/claude/2026-07-06-prompt-auditoria.md`.

- [ ] **Step 3: Adjuntar contexto**

Adjuntar o pegar `docs/audits/claude/2026-07-06-contexto-proyecto.md`.

- [ ] **Step 4: Pedir que no modifique código**

Añadir:

```text
Por favor no escribas cambios completos todavía. Primero entrega solo auditoría, hallazgos y plan priorizado.
```

### Task 5: Opción B - Claude Code local

**Files:**
- Use: local repository root `C:\Users\ASUS\Documents\Analista Deportivo`

- [ ] **Step 1: Abrir Claude Code en el repositorio**

Abrir Claude Code apuntando al workspace:

```powershell
cd "C:\Users\ASUS\Documents\Analista Deportivo"
```

- [ ] **Step 2: Confirmar exclusión de secretos**

Antes de pedir auditoría, confirmar que Claude Code no enviará `.env.local` ni secretos. Si el entorno ofrece controles de ignore, excluir:

```text
.env*
.git
node_modules
.next
playwright-report
test-results
coverage
```

- [ ] **Step 3: Pegar prompt maestro**

Pegar el contenido de:

```text
docs/audits/claude/2026-07-06-prompt-auditoria.md
```

- [ ] **Step 4: Pedir modo lectura**

Añadir:

```text
Trabaja en modo auditoría de solo lectura. No edites archivos. No ejecutes comandos destructivos. Entrega diagnóstico y plan.
```

## Fase 4: Convertir respuesta de Claude en plan implementable

### Task 6: Guardar auditoría recibida

**Files:**
- Create: `docs/audits/claude/2026-07-06-auditoria-recibida.md`

- [ ] **Step 1: Copiar respuesta completa**

Guardar la respuesta de Claude en:

```text
docs/audits/claude/2026-07-06-auditoria-recibida.md
```

- [ ] **Step 2: Revisar si incluye secretos accidentalmente**

Run:

```powershell
Select-String -Path docs/audits/claude/2026-07-06-auditoria-recibida.md -Pattern "sk-|fd_|DATABASE_URL|api_key|token|secret|postgres://" -CaseSensitive:$false
```

Expected: no aparecen valores sensibles reales.

### Task 7: Convertir auditoría en backlog

**Files:**
- Create: `docs/audits/claude/2026-07-06-backlog-implementacion.md`

- [ ] **Step 1: Clasificar hallazgos**

Crear una tabla:

```markdown
# Backlog desde auditoría Claude

| ID | Severidad | Área | Hallazgo | Acción propuesta | Prueba requerida | Estado |
|---|---|---|---|---|---|---|
| CLAUDE-P0-001 | P0 | Seguridad | Descripción exacta | Acción concreta | Comando o prueba | Pendiente |
| CLAUDE-P1-001 | P1 | Datos | Descripción exacta | Acción concreta | Comando o prueba | Pendiente |
```

- [ ] **Step 2: Separar por lotes de trabajo**

Crear secciones:

```markdown
## Lote 1: Seguridad y producción

## Lote 2: Datos/proveedores/normalización

## Lote 3: Motor estadístico y calibración

## Lote 4: UI/UX y navegación

## Lote 5: QA, performance y costos
```

- [ ] **Step 3: Definir criterio de terminado por lote**

Cada lote debe tener:

```markdown
### Criterio de terminado

- `npm run lint` pasa.
- `npx tsc --noEmit` pasa.
- `npm test` pasa.
- `npm run build` pasa.
- E2E relevante pasa.
- No hay secrets nuevos.
- No hay commit/push/deploy sin autorización.
```

## Fase 5: Ejecución posterior con Codex

### Task 8: Dar el backlog a Codex

**Files:**
- Use: `docs/audits/claude/2026-07-06-backlog-implementacion.md`

- [ ] **Step 1: Pedir ejecución por lote**

Mensaje recomendado para Codex:

```text
Aquí está la auditoría externa de Claude y el backlog derivado. Quiero que trabajemos por lotes, sin commit/push/deploy hasta que yo autorice. Empieza por validar los P0/P1, confirma cuáles aplican realmente al código actual y luego implementa con TDD y QA.
```

- [ ] **Step 2: Ejecutar primero P0/P1**

Codex debe:

```text
1. Validar si cada hallazgo existe.
2. Rechazar hallazgos falsos positivos con evidencia.
3. Implementar solo hallazgos confirmados.
4. Correr pruebas focales.
5. Correr verificación global.
6. Entregar resumen sin subir a Git.
```

- [ ] **Step 3: Mantener commits acumulados**

No hacer commit hasta que el usuario autorice el lote grande:

```text
No commit.
No push.
No deploy.
```

## Self-review

### Spec coverage

- La auditoría externa queda cubierta.
- La protección de secretos queda cubierta.
- La salida esperada de Claude queda estructurada.
- El flujo para convertir auditoría en backlog queda definido.
- La ejecución posterior con Codex queda definida.

### Placeholder scan

El plan no usa `TBD`, `TODO`, ni pasos sin criterio verificable.

### Type consistency

No aplica a tipos de código; este plan opera sobre documentación, auditoría y proceso.

