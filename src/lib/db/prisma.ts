import "server-only";

let _prisma: import("../../../generated/prisma/client").PrismaClient | null =
  null;
let _initError: unknown = null;

function createClient() {
  if (_initError) return null;
  if (_prisma) return _prisma;
  try {
    // Dynamic require so the module can be imported even when SQLite is
    // unavailable (e.g. Netlify serverless functions).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("../../../generated/prisma/client");
    const adapter = new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    });
    _prisma = new PrismaClient({ adapter });
    return _prisma;
  } catch (error) {
    _initError = error;
    console.warn(
      "[prisma] SQLite no disponible en este entorno. La persistencia está deshabilitada.",
      error,
    );
    return null;
  }
}

/**
 * Proxy that forwards Prisma calls when the DB is available and silently
 * returns safe defaults when it is not (e.g. Netlify serverless without SQLite).
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
            )
              return noopMany;
            // upsert / create / update → return a minimal object so callers
            // that destructure { id } don't crash.
            return async () => ({ id: "noop" });
          },
        },
      );
    },
  };
  return new Proxy({}, handler) as unknown as import("../../../generated/prisma/client").PrismaClient;
}

export const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = createClient();
      const target = client ?? noopClient();
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
  },
) as import("../../../generated/prisma/client").PrismaClient;
