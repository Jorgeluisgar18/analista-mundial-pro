import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("Next security configuration", () => {
  it("desactiva X-Powered-By y aplica headers defensivos", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.headers).toBeTypeOf("function");

    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find((rule) => rule.source === "/(.*)");
    const headers = new Map(
      globalRule?.headers.map((header) => [header.key, header.value]),
    );

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
  });
});
