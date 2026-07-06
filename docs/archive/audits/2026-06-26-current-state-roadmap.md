# Current State Roadmap Audit

Fecha: 2026-06-26  
Branch: `codex/neon-postgres-integration`

## Estado inicial

El proyecto estaba en `master` al reanudar la sesión. Se creó la rama `codex/neon-postgres-integration` antes de modificar código.

Cambios iniciales observados:

- Existía un plan nuevo sin seguimiento en `docs/superpowers/plans/2026-06-26-data-sources-agents-frontend-roadmap.md`.
- `node_modules` no estaba instalado, por lo que no estaba disponible `node_modules/next/dist/docs/`.
- Se ejecutó `npm install` y `prisma generate` completó correctamente.
- Se leyeron las guías locales de Next sobre variables de entorno, seguridad de datos y Route Handlers antes de tocar la integración de base de datos.

## Decisión de base de datos

La decisión del producto es usar Neon Postgres.

Razonamiento:

- Netlify serverless no ofrece persistencia confiable para SQLite.
- El sistema necesita persistir snapshots, cuotas de API, overrides, imports y auditorías.
- Neon permite Postgres gestionado con integración GitHub/Netlify y plan gratuito.

## Cambios de persistencia realizados

- `prisma/schema.prisma` ahora usa `provider = "postgresql"`.
- `prisma.config.ts` ahora usa una URL Postgres válida por defecto para generación/validación local sin secretos.
- `src/lib/db/prisma.ts` usa `@prisma/adapter-pg`.
- `src/lib/db/prisma.ts` usa `@netlify/database` como fallback de runtime para leer `NETLIFY_DB_URL` cuando Netlify DB/Neon lo inyecta.
- `prisma/seed.ts` usa `@prisma/adapter-pg`.
- `.env.example` documenta `DATABASE_URL` y `DIRECT_URL` para Neon.
- Migraciones SQLite archivadas en `prisma/migrations_sqlite_legacy/`.
- Nueva baseline Postgres creada en `prisma/migrations/20260626230000_postgres_baseline/migration.sql`.
- La misma baseline se copió a `netlify/database/migrations/20260626230000_postgres_baseline/migration.sql` para Netlify Database.
- Nuevo documento de despliegue: `docs/deployment/netlify-neon-postgres.md`.

## Go/No-Go for Data Integrations

Estado actual: **Go condicionado**.

Se puede avanzar con código de proveedores, normalizadores y UI, pero no se debe importar OpenFootball a producción ni depender de snapshots persistentes hasta que:

- `DATABASE_URL` esté configurada en Netlify con Neon.
- `npx prisma migrate deploy` se haya aplicado a Neon.
- `/api/health` confirme base de datos conectada en producción.

## Verificación ejecutada

Resultados de la primera fase Neon/Postgres:

| Comando | Resultado |
| --- | --- |
| `npx prisma generate` | Aprobado. Prisma Client 7.8.0 generado. |
| `npx prisma validate` | Aprobado. Schema Postgres válido. |
| `npm run lint` | Aprobado. |
| `npm test` | Aprobado: 25 archivos pasaron, 3 saltados; 70 tests pasaron, 6 saltados. |
| `npm run build` | Aprobado. Next.js compiló y generó 15 rutas. |
| `npm run test:e2e` | Aprobado: 3 pasaron, 1 saltado por falta de `DATABASE_URL` Postgres local. |

La extensión Neon de Netlify fue instalada en el sitio `shiny-torte-4f01e2`. La inicialización remota pidió que `@netlify/database` estuviera presente en el proyecto desplegado, por lo que el siguiente paso es publicar esta rama y disparar un deploy.

Los tests saltados son los que requieren una base Postgres real para persistencia. Se ejecutarán automáticamente cuando `DATABASE_URL` apunte a Neon.

## Pendiente de verificar con Neon real

Cuando se configure `DATABASE_URL` real de Neon:

```powershell
npx prisma migrate deploy
npx prisma db seed
npx prisma migrate status
```
