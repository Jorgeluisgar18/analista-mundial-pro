# Netlify + Neon Postgres Deployment

Fecha: 2026-06-26

Analista Mundial Pro usa Postgres como base durable para producción. Neon es la opción elegida para reemplazar SQLite en Netlify serverless.

## Variables de entorno

Configura estas variables en Netlify:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.neon.tech/neondb?sslmode=require&channel_binding=require"
```

Notas:

- `DATABASE_URL` debe ser la cadena pooled/recomendada por Neon para la aplicación.
- `DIRECT_URL` es opcional por ahora, pero queda reservada para migraciones o flujos que requieran conexión directa.
- Si usas Netlify Database/Neon, Netlify puede inyectar `NETLIFY_DB_URL` automáticamente. La app lo usa como fallback seguro cuando `DATABASE_URL` no existe.
- No uses `NEXT_PUBLIC_DATABASE_URL`.
- No pegues estas cadenas en el repositorio.
- Mantén también las claves existentes:
  - `FOOTBALL_API_KEY`
  - `FOOTBALL_DATA_API_KEY`
  - `ODDS_API_KEY`
  - `OPENAI_API_KEY`, solo cuando se apruebe el módulo de agentes.

## Migraciones

El historial activo de Prisma ahora es PostgreSQL:

```txt
prisma/migrations/20260626230000_postgres_baseline/migration.sql
```

Las migraciones SQLite antiguas fueron archivadas en:

```txt
prisma/migrations_sqlite_legacy/
```

Para aplicar migraciones con Prisma a Neon directo:

```powershell
npx prisma migrate deploy
```

Para Netlify Database, la misma baseline SQL existe también en `netlify/database/migrations/` y Netlify puede aplicarla durante el deploy.

Para cargar el seed mínimo:

```powershell
npx prisma db seed
```

## Validación local

Con `DATABASE_URL` configurada:

```powershell
npx prisma validate
npx prisma migrate status
npm run build
npm test
```

Sin `DATABASE_URL`, la app puede compilar y mostrar modo demo/no persistente, pero no debe considerarse lista para datos reales.

## Verificación en Netlify

Después de desplegar:

```powershell
Invoke-WebRequest https://TU-SITIO.netlify.app/api/health
Invoke-WebRequest https://TU-SITIO.netlify.app/api/provider-status
```

Resultado esperado:

- `/api/health` debe reportar base de datos conectada cuando Neon esté configurado.
- API-Football debe aparecer configurado si `FOOTBALL_API_KEY` está en Netlify.
- Ninguna variable secreta debe aparecer en respuestas JSON ni en HTML.

## Riesgos conocidos

- Si `DATABASE_URL` no está configurada, `src/lib/db/prisma.ts` usa un cliente no persistente defensivo para evitar caídas durante build/demo.
- Ese modo no guarda snapshots, usos de API, overrides ni imports.
- Antes de importar OpenFootball o habilitar TheSportsDB como proveedor real, confirma Neon activo en producción.
