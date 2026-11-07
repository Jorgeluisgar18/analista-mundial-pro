import { randomUUID } from "node:crypto";
import { getDatabaseRuntimeStatus, prisma } from "@/lib/db/prisma";
import { checkRateLimit, clientAddress } from "@/lib/http/rateLimit";
import { problem } from "@/lib/http/problem";

interface RateLimitRow {
  count: number;
  resetsAt: Date;
}

interface RateLimitDatabase {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
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
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const rows = await database.$queryRawUnsafe<RateLimitRow[]>(
    `INSERT INTO "RateLimitBucket" ("id", "scope", "clientKey", "count", "resetsAt", "updatedAt")
     VALUES ($1, $2, $3, 1, $4, $5)
     ON CONFLICT ("scope", "clientKey") DO UPDATE
     SET "count" = CASE
       WHEN "RateLimitBucket"."resetsAt" <= $5 THEN 1
       WHEN "RateLimitBucket"."count" < $6 + 1 THEN "RateLimitBucket"."count" + 1
       ELSE "RateLimitBucket"."count"
     END,
     "resetsAt" = CASE
       WHEN "RateLimitBucket"."resetsAt" <= $5 THEN $4
       ELSE "RateLimitBucket"."resetsAt"
     END,
     "updatedAt" = CASE
       WHEN "RateLimitBucket"."resetsAt" <= $5 OR "RateLimitBucket"."count" < $6 + 1 THEN $5
       ELSE "RateLimitBucket"."updatedAt"
     END
     RETURNING "count", "resetsAt"`,
    randomUUID(), scope, key, nextReset, now, limit,
  );
  const bucket = rows[0];
  if (!bucket) throw new Error("RateLimitBucket upsert did not return a bucket");
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetsAt: bucket.resetsAt,
  };
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
