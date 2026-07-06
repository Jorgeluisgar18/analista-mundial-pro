<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Reglas del owner (Analista Mundial Pro)

1. **No desplegar a producción** (`git push`, `netlify deploy --prod`, promover deploy) sin autorización explícita del owner.
2. **Clean code:** diffs mínimos, sin sobre-ingeniería, seguir convenciones del repo.
3. **No implementar extras** fuera del backlog acordado; si hay duda, preguntar.
4. **Documentar cada sesión** en `docs/internal/handoff.md` (sección 8 — bitácora).
5. **Leer el empalme antes de codear:** `docs/internal/handoff.md`

## Delegación por complejidad

| Nivel | IA | Ejemplos |
|-------|-----|----------|
| Alto | Codex 5.5 High | TheSportsDB real, OpenFootball runtime, caché holístico, Neon prod, smoke deploy |
| Medio / Bajo | Cursor / Composer | Diff review, docs, QA templates, tests E2E incrementales, encoding |

## Archivos clave

- Empalme: `docs/internal/handoff.md`
- QA manual: `docs/qa/manual-search-matrix.md`
- Deploy Neon: `docs/deployment/netlify-neon-postgres.md`
- Smoke prod: `docs/qa/production-smoke.md`
