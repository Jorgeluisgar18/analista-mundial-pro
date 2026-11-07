import { describe, expect, it, vi } from "vitest";
import { checkPersistentRateLimit } from "@/lib/http/persistentRateLimit";

vi.mock("server-only", () => ({}));

function createFakeRateLimitDatabase() {
  const resetsAt = new Date(Date.now() + 60_000);
  return {
    database: {
      $queryRawUnsafe: vi.fn()
        .mockResolvedValueOnce([{ count: 1, resetsAt }])
        .mockResolvedValueOnce([{ count: 2, resetsAt }])
        .mockResolvedValueOnce([{ count: 3, resetsAt }]),
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
      async $queryRawUnsafe() {
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
