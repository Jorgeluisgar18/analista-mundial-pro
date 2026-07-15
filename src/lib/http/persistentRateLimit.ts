import { randomUUID } from "node:crypto";
import { getDatabaseRuntimeStatus, prisma } from "@/lib/db/prisma";
import { checkRateLimit, clientAddress } from "@/lib/http/rateLimit";
import { problem } from "@/lib/http/problem";

interface RateLimitRow {
  count: number;
  resetsAt: Date;
}

interface RateLimitTransaction {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

interface RateLimitDatabase {
  $transaction<T>(callback: (transaction: RateLimitTransaction) => Promise<T>): Promise<T>;
}

interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  database?: RateLimitDatabase;
}

function rateLimitProblem(limit: number, resetsAt: Date) {
  const retryAfter = Math.max(
    1,
    Math.ceil((resetsAt.getTime() - Date.now()) / 1000),
  );
  const response = problem(
    429,
    "Demasiadas solicitudes",
    "Espera antes de volver a intentar esta operación.",
  );
  response.headers.set("retry-after", String(retryAfter));
  response.headers.set("x-ratelimit-limit", String(limit));
  response.headers.set("x-ratelimit-remaining", "0");
  response.headers.set("x-ratelimit-storage", "postgres");
  return response;
}

function withStorage(response: Response | null, storage: string) {
  response?.headers.set("x-ratelimit-storage", storage);
  return response;
}

async function consumeBucket(
  database: RateLimitDatabase,
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
) {
  return database.$transaction(async (transaction) => {
    const now = new Date();
    const nextReset = new Date(now.getTime() + windowMs);
    const rows = await transaction.$queryRawUnsafe<RateLimitRow[]>(
      'SELECT "count", "resetsAt" FROM "RateLimitBucket" WHERE "scope" = $1 AND "clientKey" = $2 FOR UPDATE',
      scope,
      key,
    );
    const current = rows[0];

    if (!current) {
      await transaction.$executeRawUnsafe(
        'INSERT INTO "RateLimitBucket" ("id", "scope", "clientKey", "count", "resetsAt", "updatedAt") VALUES ($1, $2, $3, 1, $4, $5)',
        randomUUID(),
        scope,
        key,
        nextReset,
        now,
      );
      return { allowed: true, remaining: limit - 1, resetsAt: nextReset };
    }

    if (current.resetsAt.getTime() <= now.getTime()) {
      await transaction.$executeRawUnsafe(
        'UPDATE "RateLimitBucket" SET "count" = 1, "resetsAt" = $3, "updatedAt" = $4 WHERE "scope" = $1 AND "clientKey" = $2',
        scope,
        key,
        nextReset,
        now,
      );
      return { allowed: true, remaining: limit - 1, resetsAt: nextReset };
    }

    if (current.count >= limit) {
      return { allowed: false, remaining: 0, resetsAt: current.resetsAt };
    }

    await transaction.$executeRawUnsafe(
      'UPDATE "RateLimitBucket" SET "count" = "count" + 1, "updatedAt" = $3 WHERE "scope" = $1 AND "clientKey" = $2',
      scope,
      key,
      now,
    );
    return {
      allowed: true,
      remaining: Math.max(0, limit - current.count - 1),
      resetsAt: current.resetsAt,
    };
  });
}

export async function checkPersistentRateLimit(
  request: Request,
  scope: string,
  { limit = 20, windowMs = 60_000, database }: RateLimitOptions = {},
) {
  const selectedDatabase = database ?? (prisma as unknown as RateLimitDatabase);
  const canUseDatabase =
    Boolean(database) || getDatabaseRuntimeStatus().status === "configured";

  if (!canUseDatabase) {
    const fallback = checkRateLimit(request, scope, { limit, windowMs });
    fallback?.headers.set("x-ratelimit-storage", "memory-fallback");
    return fallback;
  }

  let result: Awaited<ReturnType<typeof consumeBucket>>;
  try {
    result = await consumeBucket(
      selectedDatabase,
      scope,
      clientAddress(request),
      limit,
      windowMs,
    );
  } catch {
    return withStorage(
      checkRateLimit(request, scope, { limit, windowMs }),
      "memory-fallback-db-error",
    );
  }

  if (!result.allowed) return rateLimitProblem(limit, result.resetsAt);
  return null;
}
