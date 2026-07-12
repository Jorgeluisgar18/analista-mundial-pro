# Estado Actual del Proyecto y Mejoras por Implementar
## Analista Mundial Pro — 11/07/2026

---

## 1. MÉTRICAS DE SALUD

| Indicador | Valor | Estado |
|-----------|-------|--------|
| **Build** | 0 errores | ✅ |
| **Typecheck** | `tsc --noEmit` limpio | ✅ |
| **Lint** | `eslint` limpio | ✅ |
| **Tests unitarios** | 52/57 files (179 pass, 8 skip) | ✅ |
| **Tests E2E** | 10 tests en 2 specs | ✅ |
| **Working directory** | Limpio, sin cambios sin commit | ✅ |
| **Último commit** | `aa84b21 fix: resolve national team flags` | ✅ |
| **DB local Neon** | Connected | ✅ |
| **Bitácora** | `handoff.md` actualizado hasta 2026-07-08 | ✅ |
| **Informe QA** | `docs/qa/qa-report-2026-07-09.md` completo | ✅ |

---

## 2. ARQUITECTURA — LO QUE TENEMOS (SÓLIDO)

### 2.1 Motor de Análisis
Ensemble de 3 modelos (Dixon-Coles 60%, Monte Carlo 20%, Regresión Logística 20%) con calibración histórica vía shrinkage de probabilidades empíricas y ajuste de confianza. Genera 30+ predicciones categorizadas y narrativa contextual en español.

### 2.2 Pipeline de Proveedores
6 proveedores registrados con política de cuota, fallback multi-proveedor, deduplicación de requests en vuelo, caché de snapshots multi-recurso, enriquecimiento progresivo (weather, odds), y telemetría de uso persistente.

### 2.3 UI Premium
Cabina de análisis con 10 secciones modulares, soporte responsive/mobile, overrides manuales con token de analista, export HTML autónomo, y Health Panel de observabilidad.

### 2.4 Infraestructura
Prisma 7 + Neon Postgres (local conectado), CI mínimo (lint/typecheck/test/build), rate limiting persistente, CSP hardening, zona horaria Colombia (COT), suite de 52 archivos de test.

### 2.5 Backtesting
Script `scripts/run-backtest.ts` con calibración empírica vía `CalibrationRun`, métricas (Brier, LogLoss, RPS), persistencia en BD, y fuente dual (analysisRun + historicalMatch rolling offline).

---

## 3. QUÉ NOS FALTA (GAPS POR PRIORIDAD)

### 🔴 CRÍTICO — Rompen funcionalidad o son features incompletas

| ID | Gap | Impacto |
|----|-----|---------|
| **G1** | `matchSnapshotCache` no tiene write path — solo lee, nunca persiste snapshots | Caché huérfano: las snapshots nunca se crean desde el runtime |
| **G2** | `listByDate` no usa caché ni enriquecimiento — solo `getById` tiene pipeline completo | Listados de partidos no se benefician de weather/odds/caché |
| **G3** | Export HTML omite ~50% del `AnalysisResult`: scenarios, arbitrage, alerts, calibration, dataQuality, expectedValues | El export está incompleto, no refleja el análisis real |

### 🟡 ALTO — Degradan calidad del modelo o experiencia

| ID | Gap | Impacto |
|----|-----|---------|
| **G4** | Coeficientes de regresión logística (`[1.35, 0.62, 0.48, 0.4]`) y pesos del ensemble (60/20/20) son hardcoded, no calibrados con datos reales | Modelo heurístico, no verdaderamente "machine learning" |
| **G5** | `historicalFormFromMatches` no distingue local/visitante | Forma histórica sin contexto de venue reduce precisión de señal |
| **G6** | El `formAnalysis` ignora `referenceDate` explícito — usa `new Date()` implícito | Análisis no determinístico ante replay/backtesting |
| **G7** | `apiQuotaDecision` ignora `resetsAt` — podría permitir llamadas si el reset es inminente | Desperdicio de cuota en ventanas de rollover |

### 🟢 MEDIO/BAJO — Mejoras de calidad y UX

| ID | Gap | Impacto |
|----|-----|---------|
| **G8** | No hay sistema de logging persistente (`docs/qa` lo marca como PENDIENTE) | Sin auditabilidad de errores en runtime |
| **G9** | El `providerConfig` solo valida presencia de env var, no formato válido de API key | `FOOTBALL_API_KEY=basura` se trata como "configurado" |
| **G10** | Sin retry con backoff exponencial en providers — un error transitorio descarta el provider | Fragilidad ante timeouts de red |
| **G11** | `AnalysisCabin` no tiene UI de error si `refresh()` falla — falla silenciosamente | Usuario no sabe que el refresh fracasó |
| **G12** | No hay indicador visual de `dataOrigin === "DEMO"` en la cabina | Usuario no distingue datos reales de demo |
| **G13** | `listByDate` busca solo por `competition.id` exacto, no por nombre/alias | UX de búsqueda limitada |
| **G14** | `Solo observación` tier puede aparecer con probabilidades artificialmente bajas (0.52) | Confusión en value betting |

---

## 4. PENDIENTES DEL BACKLOG (handoff.md)

### Completados ✅
- P0-1 Deploy a Netlify
- P1-1 TheSportsDB
- P1-2 OpenFootball
- P1-3 Backtesting foundation
- P1-4 UI premium
- P3-1 Auditoría encoding
- P3-2 AGENTS.md
- P3-3 .env.example
- P3-4 npm test + build
- P3-5 UI polish

### Pendientes del backlog ⏳
| ID | Tarea | Estado |
|----|-------|--------|
| P0-2 | Verificar Neon/Netlify DB en producción | 🔴 No verificado |
| P0-3 | Smoke test real post-deploy | 🔴 No ejecutado |
| P1-3 | QA casos reales por liga/competición | 🟡 Matriz creada, sin ejecutar |
| P1-4 | Optimización holística de caché | 🔴 No iniciado |
| P2-2 | Commit organizado cambios locales | ✅ Working dir ya está limpio |
| P2-4 | Ampliar E2E responsive | 🟡 Pendiente |
| P2-5 | Consistencia docs | 🟡 Pendiente |
| P2-6 | QA matrix execution | 🟡 Creada, verificar |
| P2-7 | RefreshService invalidación caché | 🟡 Pendiente |

---

## 5. RIESGOS

| Riesgo | Severidad | Descripción |
|--------|-----------|-------------|
| **Caché sin write path** | 🔴 ALTO | Sin persistencia de snapshots, el caché está muerto. Cada request regenera todo. |
| **Modelo heurístico** | 🟡 MEDIO | Ensemble con pesos fijos y coeficientes mágicos. No escala con más datos. |
| **Export incompleto** | 🟡 MEDIO | La mitad del análisis no llega al HTML. Valor de la feature diluido. |
| **Neon no verificado en prod** | 🔴 ALTO | Sin smoke test real post-deploy, no sabemos si BD funciona en Netlify. |
| **API-Football free tier** | 🟡 MEDIO | Cuota diaria de 100; sin caché funcional, se quema rápido. |
| **Sin logging persistente** | 🟢 BAJO | Difícil diagnosticar fallos en producción sin logs. |

---

## 6. ORDEN RECOMENDADO DE IMPLEMENTACIÓN FUTURA

```text
Fase A — CRÍTICO (siguiente sprint, 2-3 días):
  1. G1: Implementar write path en matchSnapshotCache
  2. G2: Extender listByDate con caché + enriquecimiento
  3. G3: Completar HTML export con scenarios/arbitrage/alerts/calibration/dataQuality/expectedValues

Fase B — ALTO (mejora del modelo, 3-5 días):
  4. P1-4: Optimización holística de caché (ya con write path)
  5. G4: Pipeline de calibración de coeficientes con CalibrationRun histórico
  6. P0-2 + P0-3: Verificar Neon prod + smoke test
  7. G5: home/away context en historicalForm

Fase C — UX/PULIDO (1-2 días):
  8. G11: Error UI en AnalysisCabin
  9. G12: Indicador DEMO en cabina
  10. G8: Logging persistente básico
  11. P2-4: E2E responsive ampliado
  12. G7: apiQuotaDecision aware de resetsAt
```

---

## 7. VEREDICTO FINAL

**El proyecto está en nivel "Beta funcional con gaps estructurales".**

- **Fortalezas**: Pipeline multi-proveedor robusto, ensemble funcional, UI premium completa, 179 tests verdes, infraestructura limpia, build 0 errores.
- **Debilidades**: Caché sin write path (muerto en runtime), modelo heurístico sin retroalimentación de datos, export HTML incompleto, sin verificación de producción real.
- **Próximo paso inequívoco**: Implementar el write path del caché (`matchSnapshotCache`) para que el sistema tenga memoria persistente. Sin eso, cada request es un "cold start".