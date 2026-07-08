import { describe, expect, it, vi } from "vitest";
import { resilientFetch } from "@/lib/providers/http";

function response(status: number) {
  return new Response("{}", { status });
}

describe("resilientFetch", () => {
  it("reintenta errores transitorios y devuelve la respuesta exitosa", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));

    const result = await resilientFetch(fetcher, "https://example.test", {
      retries: 1,
      retryDelayMs: 1,
    });

    expect(result.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("no reintenta errores de credenciales", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(401));

    const result = await resilientFetch(fetcher, "https://example.test", {
      retries: 2,
      retryDelayMs: 1,
    });

    expect(result.status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("no reintenta rate limit o cuota agotada por defecto", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(429));

    const result = await resilientFetch(fetcher, "https://example.test", {
      retries: 2,
      retryDelayMs: 1,
    });

    expect(result.status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reintenta errores de red hasta agotar intentos", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      resilientFetch(fetcher, "https://example.test", {
        retries: 1,
        retryDelayMs: 1,
        retryLabel: "Proveedor QA",
      }),
    ).rejects.toThrow(/Proveedor QA no respondió tras 2 intento/);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
