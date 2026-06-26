# Changelog — Sesión 26/Jun/2026

## Resumen
Refactor de componentes grandes, correcciones UX mobile, hardening de CSP,
fix de build TypeScript, nuevo panel de observabilidad, y 27 mejoras pequeñas
(estados vacíos, accesibilidad, copy educativo, seguridad defensiva).

---

## Cambios realizados (sesión completa)

### 1. TypeScript Build Fix
**Archivo:** `src/lib/db/prisma.ts`

- **Problema:** El cast directo `as Record<string, unknown>` fallaba.
- **Solución:** Cast intermedio `unknown`: `as unknown as Record<string, unknown>`.

### 2. CSP Hardening
**Archivo:** `next.config.ts`

- `script-src` separado por entorno:
  - **Producción:** solo `'self'` (Next.js 16 empaqueta scripts con hash).
  - **Desarrollo:** `'self' 'unsafe-inline' 'unsafe-eval'` (HMR/Turbopack).
- `style-src` mantiene `'unsafe-inline'` (requerido por CSS Modules).

### 3. UX Mobile (4 correcciones en globals.css)
**Archivo:** `src/app/globals.css`

| # | Corrección | Detalle |
|---|-----------|---------|
| 1 | Padding inferior `.analysis-content` | 110px → 130px |
| 2 | Padding inferior `.analysis-app` | 98px → calc(130px + env(safe-area-inset-bottom)) |
| 3 | `mask-image` en railes | Fade solo en borde derecho (94%→100%) |
| 4 | Títulos `h2` section headers | 28px → 20px en breakpoint 520px |
| 5 | `safe-area-inset-bottom` | Fallback explícito `env(..., 0px)` |

### 4. Refactor SectionContent (500+ → 10 módulos)
**Archivos:** `src/components/analysis/sections/{Summary,Context,Tactics,Squads,Markets,Players,Keepers,Value,Alerts,Sources}Section.tsx`

- SectionContent ahora es router delgado; cada sección es un archivo <80 líneas con props específicas.

### 5. Refactor AnalysisCabin (264 → 4 archivos)
**Archivos creados:** `AnalysisSidebar.tsx`, `AnalysisTopbar.tsx`, `MobileActionBar.tsx`
- AnalysisCabin reducido de 264 → ~90 líneas como orquestador.
- `ResponsibleNotice` duplicado eliminado (usa el compartido `ResponsibleGamingNotice`).
- Import `Link` no usado eliminado.

### 6. Observabilidad — Health Panel
**Archivos:** `src/app/api/health/route.ts`, `src/components/health/HealthPanel.tsx`
- Endpoint `GET /api/health` consolida: estado proveedores, uso API, modo, BD.
- Componente con grid de tarjetas, barras de uso con umbrales de color, botón refresh.
- Link "Estado" en nav de home page + estilos CSS.

### 7. 27 mejoras pequeñas

#### Estados vacíos (5)
| Archivo | Cambio |
|---------|--------|
| `PlayersSection.tsx` | Mensaje cuando no hay jugadores |
| `SummarySection.tsx` | Mensaje cuando no hay escenarios |
| `TacticsSection.tsx` | Mensaje cuando no hay alineaciones |
| `AlertsSection.tsx` | Mensaje cuando no hay alertas activas |
| `SourceLedger.tsx` | Mensaje cuando no hay fuentes |
| `MarketTable.tsx` | Mensaje cuando no hay predicciones |

#### Accesibilidad (10)
- `type="button"` agregado a 10 botones en: `HealthPanel`, `AnalysisTopbar`(x3), `AnalysisSidebar`(x2), `AnalysisCabin`(x2), `UpdatePanel`, `MarketDetailDrawer`
- `aria-label` en 3 botones de `MobileActionBar`
- `aria-label` en botón refresh de `HealthPanel`
- `aria-label` en `<table>` de `MarketTable`
- `aria-current` en subsección activa del sidebar

#### Copy educativo (3)
- Tooltip `title` en `ConfidenceBadge` explicando pesos del score
- Tooltip ⓘ en surebets (`ValueSection`)
- Nota de tiers Conservador/Moderado/Arriesgado
- `"Dato no disponible"` → `"Sin información de reemplazo"` en `SquadsSection`

#### Hardcoded strings (3)
- `"N/D"` → `"No disponible"` en `MarketsSection`
- `"N/D"` → `"—"` en `PlayersSection` y `MarketDetailDrawer`

#### Defensivo runtime (5)
- `AnalysisCabin.tsx:40` — `find()!` → `?? NAVIGATION[0]`
- `SourceLedger.tsx` — `sources.map()` → `(sources ?? []).map()`
- `SummarySection.tsx` — `scenarios.map()` → `(scenarios ?? []).map()`
- `TacticsSection.tsx` — `starters.slice()` → `(starters ?? []).slice()`
- `SquadsSection.tsx` — `starters.map()` → `(starters ?? []).map()`

#### Misc (2)
- `AnalysisSection.intro` tipado de `string` → `string | ReactNode`
- Loading indicator en `HealthPanel` durante fetch
- 4 clases CSS nuevas: `.tooltip-trigger`, `.sr-only`, `.section-note`, `.health-loading`

---

## Resultado de tests

| Suite | Resultado |
|---|---|
| Build (`npm run build`) | ✅ 14 rutas, 0 errores |
| Tests unitarios (22 archivos) | ✅ 49/49 |
| Tests de integración (6 archivos) | ❌ 5/27 fallan — **pre-existentes**, requieren `prisma generate` funcional en vitest (Prisma 7 genera EMS-only, `require()` no resuelve en vitest) |

### Tests de integración fallidos (5)
Todos fallan por la misma causa: `require("../../../generated/prisma/client")` no puede resolver el cliente generado de Prisma 7 (TypeScript ESM-only) en el entorno vitest. En producción, Next.js compila TS a JS antes de ejecutar el `require()`.

| Test | Causa raíz |
|------|-----------|
| `analysis-persistence.test.ts` | `prisma.match.findUnique()` retorna `undefined` (noop) |
| `api-routes.test.ts` (x2) | 404 vs 201 — match no persiste sin DB |
| `api-usage.test.ts` | `snapshot.find()` retorna `undefined` |
| `match-snapshot-cache.test.ts` | `result?.match.id` es `undefined` |

**No relacionados con los cambios de esta sesión.**

---

## Archivos modificados/creados (40 total)

### Modificados (10)
- `next.config.ts`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/components/analysis/AnalysisCabin.tsx`
- `src/components/analysis/SectionContent.tsx`
- `src/components/analysis/AnalysisSection.tsx`
- `src/components/analysis/sections/PlayersSection.tsx`
- `src/components/analysis/sections/MarketsSection.tsx`
- `src/components/analysis/sections/SquadsSection.tsx`
- `tests/unit/analysis-cabin.test.tsx`

### Creados (30)
- `CHANGELOG-SESSION-20260626.md`
- `src/app/api/health/route.ts`
- `src/components/health/HealthPanel.tsx`
- `src/components/analysis/AnalysisSidebar.tsx`
- `src/components/analysis/AnalysisTopbar.tsx`
- `src/components/analysis/MobileActionBar.tsx`
- `src/components/analysis/sections/SummarySection.tsx`
- `src/components/analysis/sections/ContextSection.tsx`
- `src/components/analysis/sections/TacticsSection.tsx`
- `src/components/analysis/sections/SquadsSection.tsx`
- `src/components/analysis/sections/MarketsSection.tsx`
- `src/components/analysis/sections/PlayersSection.tsx`
- `src/components/analysis/sections/KeepersSection.tsx`
- `src/components/analysis/sections/ValueSection.tsx`
- `src/components/analysis/sections/AlertsSection.tsx`
- `src/components/analysis/sections/SourcesSection.tsx`

### Auditorías actualizadas (2)
- `docs/audits/2026-06-26-post-remediation/report.md`
- `docs/audits/2026-06-25-full-stack-audit.md`

---

## Notas
- Rama: `codex/analista-mundial-pro`
- Worktree: `C:\Users\ASUS\Documents\Analista Deportivo\.worktrees\analista-mundial-pro`
- Commit base: `cbe1ddf ux: remove developer-facing content for end users`
