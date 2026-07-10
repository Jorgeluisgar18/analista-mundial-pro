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

  it("no confía en x-forwarded-for por defecto", async () => {
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

    const firstSpoofedAddress = new Request("http://local/api/test", {
      headers: { "x-forwarded-for": "203.0.113.8" },
    });
    const secondSpoofedAddress = new Request("http://local/api/test", {
      headers: { "x-forwarded-for": "203.0.113.99" },
    });

    expect(
      checkRateLimit(firstSpoofedAddress, "spoof-test", {
        limit: 1,
        windowMs: 60_000,
      }),
    ).toBeNull();
    const blocked = checkRateLimit(secondSpoofedAddress, "spoof-test", {
      limit: 1,
      windowMs: 60_000,
    });

    expect(blocked?.status).toBe(429);
  });

  it("usa el encabezado de IP confiable de Netlify cuando existe", async () => {
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

    const firstClient = new Request("http://local/api/test", {
      headers: { "x-nf-client-connection-ip": "203.0.113.8" },
    });
    const secondClient = new Request("http://local/api/test", {
      headers: { "x-nf-client-connection-ip": "203.0.113.99" },
    });

    expect(
      checkRateLimit(firstClient, "netlify-ip-test", {
        limit: 1,
        windowMs: 60_000,
      }),
    ).toBeNull();
    expect(
      checkRateLimit(secondClient, "netlify-ip-test", {
        limit: 1,
        windowMs: 60_000,
      }),
    ).toBeNull();
  });
});
