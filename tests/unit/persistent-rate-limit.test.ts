import { describe, expect, it, vi } from "vitest";
import { checkPersistentRateLimit } from "@/lib/http/persistentRateLimit";

vi.mock("server-only", () => ({}));

function createFakeRateLimitDatabase() {
  const buckets = new Map<string, { count: number; resetsAt: Date }>();
  return {
    buckets,
    database: {
      async $transaction<T>(callback: (transaction: {
        $queryRawUnsafe<TQuery = unknown>(
          query: string,
          ...values: unknown[]
        ): Promise<TQuery>;
        $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
      }) => Promise<T>) {
        return callback({
          async $queryRawUnsafe<TQuery = unknown>(_query: string, ...values: unknown[]) {
            const key = `${values[0]}:${values[1]}`;
            const bucket = buckets.get(key);
            return (bucket ? [bucket] : []) as TQuery;
          },
          async $executeRawUnsafe(query: string, ...values: unknown[]) {
            if (query.startsWith("INSERT")) {
              const [, scope, clientKey, resetsAt] = values;
              buckets.set(`${scope}:${clientKey}`, {
                count: 1,
                resetsAt: resetsAt as Date,
              });
              return 1;
            }
            const [scope, clientKey] = values;
            const key = `${scope}:${clientKey}`;
            const current = buckets.get(key);
            if (!current) return 0;
            if (query.includes('"count" = 1')) {
              current.count = 1;
              current.resetsAt = values[2] as Date;
              return 1;
            }
            current.count += 1;
            return 1;
          },
        });
      },
    },
  };
}

describe("persistent rate limit", () => {
  it("bloquea solicitudes usando el bucket persistente compartido", async () => {
    const { database } = createFakeRateLimitDatabase();
    const request = new Request("http://local/api/test", {
      headers: { "x-forwarded-for": "203.0.113.8" },
    });

    await expect(
      checkPersistentRateLimit(request, "test", {
        limit: 2,
        windowMs: 60_000,
        database,
      }),
    ).resolves.toBeNull();
    await expect(
      checkPersistentRateLimit(request, "test", {
        limit: 2,
        windowMs: 60_000,
        database,
      }),
    ).resolves.toBeNull();

    const blocked = await checkPersistentRateLimit(request, "test", {
      limit: 2,
      windowMs: 60_000,
      database,
    });

    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("x-ratelimit-storage")).toBe("postgres");
  });

  it("degrada a memoria si el bucket persistente falla", async () => {
    const request = new Request("http://local/api/test", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    const database = {
      async $transaction() {
        throw new Error("RateLimitBucket no disponible");
      },
    };

    const blocked = await checkPersistentRateLimit(request, "db-fallback-test", {
      limit: 0,
      windowMs: 60_000,
      database,
    });

    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("x-ratelimit-storage")).toBe(
      "memory-fallback-db-error",
    );
  });
});
