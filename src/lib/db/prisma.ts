import "server-only";

let _prisma: import("../../../generated/prisma/client").PrismaClient | null =
  null;
let _initError: unknown = null;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (url && !url.startsWith("file:")) return url;

  try {
    // Netlify Database exposes NETLIFY_DB_URL at runtime. Keeping this as an
    // optional fallback lets local/dev use DATABASE_URL while production can be
    // provisioned by the Netlify Neon integration without committing secrets.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getConnectionString } = require("@netlify/database");
    const netlifyDatabaseUrl = getConnectionString()?.trim();
    if (netlifyDatabaseUrl && !netlifyDatabaseUrl.startsWith("file:")) {
      return netlifyDatabaseUrl;
    }
  } catch {
    return null;
  }

  return null;
}

function createClient() {
  if (_initError) return null;
  if (_prisma) return _prisma;

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    _initError = new Error(
      "DATABASE_URL no está configurada con una conexión Postgres/Neon.",
    );
    console.warn(
      "[prisma] DATABASE_URL no está configurada con Postgres. La persistencia está deshabilitada.",
    );
    return null;
  }

  try {
    // Dynamic require so the module can be imported during builds even when
    // the production database is not available.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("../../../generated/prisma/client");
    const adapter = new PrismaPg(databaseUrl);
    _prisma = new PrismaClient({ adapter });
    return _prisma;
  } catch (error) {
    _initError = error;
    console.warn(
      "[prisma] No fue posible inicializar Postgres/Neon. La persistencia está deshabilitada.",
      error,
    );
    return null;
  }
}

export function getDatabaseRuntimeStatus() {
  const client = createClient();
  if (client) {
    return {
      status: "configured" as const,
      error: null,
    };
  }

  return {
    status: "unavailable" as const,
    error:
      _initError instanceof Error
        ? _initError.message
        : "DATABASE_URL no está configurada con una conexión Postgres/Neon.",
  };
}

/**
 * Proxy that forwards Prisma calls when the DB is available and returns safe
 * defaults when it is not. This keeps build/demo routes alive, but production
 * must configure DATABASE_URL with Neon/Postgres before relying on persistence.
 */
function noopClient() {
  const noop = async () => null;
  const noopMany = async () => [];
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "$transaction") {
        return async (fn: (tx: object) => Promise<unknown>) =>
          fn(new Proxy({}, handler));
      }
      return new Proxy(
        {},
        {
          get(_t, method) {
            if (method === "findUnique" || method === "findFirst") return noop;
            if (
              method === "findMany" ||
              method === "createMany" ||
              method === "deleteMany"
            ) {
              return noopMany;
            }
            // upsert / create / update -> return a minimal object so callers
            // that destructure { id } don't crash.
            return async () => ({ id: "noop" });
          },
        },
      );
    },
  };
  return new Proxy(
    {},
    handler,
  ) as unknown as import("../../../generated/prisma/client").PrismaClient;
}

export const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = createClient();
      const target = client ?? noopClient();
      const value = (target as unknown as Record<string | symbol, unknown>)[
        prop
      ];
      return typeof value === "function" ? value.bind(target) : value;
    },
  },
) as import("../../../generated/prisma/client").PrismaClient;
