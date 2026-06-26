# Changelog — Sesión 26/Jun/2026

## Resumen
Refactor de componentes grandes, correcciones UX mobile, hardening de CSP,
fix de build TypeScript, y nuevo panel de observabilidad en home.

---

## Cambios realizados

### 1. TypeScript Build Fix
**Archivo:** `src/lib/db/prisma.ts`

- **Problema:** El cast directo `as Record<string, unknown>` fallaba porque
  TypeScript no permite saltar de `PrismaClient` a `Record` directamente.
- **Solución:** Se agregó cast intermedio a `unknown`: `as unknown as Record<string, unknown>`.

### 2. CSP Hardening
**Archivo:** `next.config.ts`

- `script-src` separado por entorno:
  - **Producción:** solo `'self'` (Next.js 16 empaqueta scripts con hash).
  - **Desarrollo:** `'self' 'unsafe-inline' 'unsafe-eval'` (necesario para
    HMR/Turbopack).
- `style-src` se mantiene con `'unsafe-inline'` (requerido por CSS Modules).
- Esto elimina vulnerabilidad de XSS por inline scripts en producción.

### 3. UX Mobile (4 correcciones en globals.css)
**Archivo:** `src/app/globals.css`

| # | Corrección | Detalle |
|---|-----------|---------|
| 1 | Padding inferior `.analysis-content` | 110px → 130px para evitar solapamiento con action bar + safe-area |
| 2 | Padding inferior `.analysis-app` | 98px → calc(130px + env(safe-area-inset-bottom)) |
| 3 | `mask-image` en railes | Cambiado de fade simétrico (ambos lados) a fade solo en borde derecho (94%→100%). El fade izquierdo impedía ver el indicador de scroll. |
| 4 | Títulos `h2` en section headers | Reducido de 28px → 20px en breakpoint 520px |
| 5 | `env(safe-area-inset-bottom)` | Fallback explícito `env(safe-area-inset-bottom, 0px)` en `.mobile-actionbar` para navegadores sin soporte |

### 4. Refactor SectionContent (500+ → 10 módulos)
**Archivos creados:** `src/components/analysis/sections/{Summary,Context,Tactics,Squads,Markets,Players,Keepers,Value,Alerts,Sources}Section.tsx`

**Archivo modificado:** `src/components/analysis/SectionContent.tsx`

- SectionContent original tenía 500+ líneas con toda la lógica de renderizado
  de todas las secciones en un solo componente.
- **Refactor:** Se extrajo cada sección a su propio archivo (<80 líneas c/u).
- SectionContent ahora es un router delgado que selecciona el módulo según
  el `sectionId`.
- Cada sección recibe solo las props que necesita (interfaces específicas),
  facilitando testing y mantenimiento.
- Las props compartidas se definen en `src/components/analysis/sectionTypes.ts`.

### 5. Refactor AnalysisCabin (264 → 4 archivos)
**Archivos creados:**
- `src/components/analysis/AnalysisSidebar.tsx` — Sidebar con subnavegación
- `src/components/analysis/AnalysisTopbar.tsx` — Top bar con branding + acciones
- `src/components/analysis/MobileActionBar.tsx` — Barra inferior mobile

**Archivo modificado:** `src/components/analysis/AnalysisCabin.tsx`

- AnalysisCabin se redujo de 264 → ~90 líneas.
- Ahora es un orquestador puro que:
  1. Gestiona estado global (sección activa, drawer, scroll)
  2. Delega UI a componentes especializados
  3. Mantiene la lógica de coordinación entre componentes
- Se eliminó el componente `ResponsibleNotice` duplicado y se usa el
  componente compartido `ResponsibleGamingNotice` de `@/components/shared/`.
- Se eliminó import no usado de `Link` (se movió a AnalysisTopbar).

### 6. Observabilidad — Health Panel
**Archivos creados:**
- `src/app/api/health/route.ts` — Endpoint GET que consolida:
  - Estado de proveedores (configurados/no)
  - Uso de API (used/limit por provider)
  - Estado de base de datos
  - Modo (demo / api-ready)
- `src/components/health/HealthPanel.tsx` — Componente cliente que:
  - Fetch de `/api/health` al montar
  - Badge de modo con colores (ámbar demo, esmeralda API activa)
  - Grid de tarjetas de proveedor con indicador verde/gris
  - Barra de uso con umbrales de color (<50% verde, 50-80% ámbar, >80% coral)
  - Botón de refresco sin recargar página
  - Responsive: columnas en desktop, single column en mobile

**Archivo modificado:** `src/app/page.tsx`

- Se agregó link de navegación "Estado" → `#salud`
- Se agregó `<HealthPanel />` entre la sección de principios y el footer
- Se agregó import de HealthPanel

**Archivo modificado:** `src/app/globals.css`

- Se agregaron ~225 líneas de estilos para el health panel (`.health-panel`,
  `.health-grid`, `.health-provider`, `.health-usage-bar`, etc.)

---

## Archivos relevantes (resumen)

| Archivo | Cambio |
|---------|--------|
| `src/lib/db/prisma.ts:73` | Fix TS build (cast con `unknown`) |
| `next.config.ts` | CSP hardening producción/desarrollo |
| `src/app/globals.css` | 4 correcciones UX mobile + estilos health panel |
| `src/components/analysis/SectionContent.tsx` | Router a 10 módulos |
| `src/components/analysis/sections/*.tsx` | 10 secciones individuales (nuevos) |
| `src/components/analysis/AnalysisCabin.tsx` | Orquestador (264→90 líneas) |
| `src/components/analysis/AnalysisSidebar.tsx` | Sidebar extraído (nuevo) |
| `src/components/analysis/AnalysisTopbar.tsx` | Topbar extraído (nuevo) |
| `src/components/analysis/MobileActionBar.tsx` | Action bar mobile (nuevo) |
| `src/app/api/health/route.ts` | Endpoint de salud (nuevo) |
| `src/components/health/HealthPanel.tsx` | Panel de observabilidad (nuevo) |
| `src/app/page.tsx` | HealthPanel + link nav |

---

## Tests
- **Build:** ✅ (Next.js 16, Turbopack)
- **Tests unitarios:** 49/49 ✅
- **Tests de integración:** 5 fallan por falta de `prisma generate` (requiere
  `npx prisma generate` + `npm run db:migrate` en entorno local)

## Notas
- El proyecto usa worktree `codex/analista-mundial-pro`.
- Rama actual: `codex/analista-mundial-pro` (up to date con origin).
- Commit anterior: `cbe1ddf ux: remove developer-facing content for end users`.
