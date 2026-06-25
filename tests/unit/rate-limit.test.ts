import { afterEach, describe, expect, it } from "vitest";

describe("local rate limit", () => {
  let reset: (() => void) | undefined;

  afterEach(() => reset?.());

  it("bloquea solicitudes que superan la ventana configurada", async () => {
    const rateLimitModule = await import("@/lib/http/rateLimit").catch(
      () => ({}),
    );
    const checkRateLimit = Reflect.get(rateLimitModule, "checkRateLimit") as
      | ((
          request: Request,
          scope: string,
          options: { limit: number; windowMs: number },
        ) => Response | null)
      | undefined;
    reset = Reflect.get(rateLimitModule, "resetRateLimitsForTests") as
      | (() => void)
      | undefined;

    expect(checkRateLimit).toBeTypeOf("function");
    if (!checkRateLimit) return;

    const request = new Request("http://local/api/test", {
      headers: { "x-forwarded-for": "203.0.113.8" },
    });

    expect(
      checkRateLimit(request, "test", { limit: 2, windowMs: 60_000 }),
    ).toBeNull();
    expect(
      checkRateLimit(request, "test", { limit: 2, windowMs: 60_000 }),
    ).toBeNull();
    const blocked = checkRateLimit(request, "test", {
      limit: 2,
      windowMs: 60_000,
    });

    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("retry-after")).toBeTruthy();
  });
});
