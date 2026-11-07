import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireSameOrigin } from "@/lib/http/requestGuards";
import { POST as analyze } from "@/app/api/match/[id]/analyze/route";
import { POST as refresh } from "@/app/api/match/[id]/refresh/route";
import { POST as overrides } from "@/app/api/match/[id]/overrides/route";

const effects = vi.hoisted(() => ({
  limit: vi.fn(),
  analyst: vi.fn(),
  analysis: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/http/persistentRateLimit", () => ({ checkPersistentRateLimit: effects.limit }));
vi.mock("@/lib/auth/analyst", () => ({ requireAnalyst: effects.analyst }));
vi.mock("@/lib/services/analysisService", () => ({ getAnalysis: effects.analysis }));
vi.mock("@/lib/services/refreshService", () => ({ refreshMatch: effects.refresh }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {}, getDatabaseRuntimeStatus: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  effects.limit.mockResolvedValue(null);
  effects.analyst.mockReturnValue(new Response(null, { status: 401 }));
  effects.analysis.mockResolvedValue({ analysis: { marker: "analysis" } });
  effects.refresh.mockResolvedValue({ marker: "refresh" });
});

describe("mutation origin guard", () => {
  it.each([undefined, "", "null", "https://other.example"])("rejects disallowed Origin %s", async (origin) => {
    const request = new Request("https://app.example/api/test", {
      method: "POST",
      headers: origin === undefined ? {} : { origin },
    });
    const response = requireSameOrigin(request);
    expect(response?.status).toBe(403);
    expect(response?.headers.get("content-type")).toContain("application/problem+json");
    expect(await response?.json()).toMatchObject({ status: 403, title: "Origen no permitido" });
  });

  it("allows the exact application origin", () => {
    expect(requireSameOrigin(new Request("https://app.example/api/test", {
      method: "POST", headers: { origin: "https://app.example" },
    }))).toBeNull();
  });

  for (const [name, handler] of [["analyze", analyze], ["refresh", refresh], ["overrides", overrides]] as const) {
    it.each([undefined, "", "https://other.example"])(`${name} rejects Origin %s before side effects`, async (origin) => {
      const request = new Request(`https://app.example/api/match/test/${name}`, {
        method: "POST",
        headers: origin === undefined ? {} : { origin },
        body: "{}",
      });
      const readBody = vi.spyOn(request, "text");
      const response = await handler(request, { params: Promise.resolve({ id: "test" }) });
      expect(response.status).toBe(403);
      expect(effects.limit).not.toHaveBeenCalled();
      expect(effects.analyst).not.toHaveBeenCalled();
      expect(effects.analysis).not.toHaveBeenCalled();
      expect(effects.refresh).not.toHaveBeenCalled();
      expect(readBody).not.toHaveBeenCalled();
    });
  }

  it("preserves same-origin analysis output", async () => {
    const response = await analyze(new Request("https://app.example/api/match/test/analyze", {
      method: "POST", headers: { origin: "https://app.example" },
    }), { params: Promise.resolve({ id: "test" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ marker: "analysis" });
    expect(effects.analysis).toHaveBeenCalledWith("test");
  });

  it("preserves same-origin refresh flags and output", async () => {
    const response = await refresh(new Request("https://app.example/api/match/test/refresh?force=true", {
      method: "POST", headers: { origin: "https://app.example" },
    }), { params: Promise.resolve({ id: "test" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ marker: "refresh" });
    expect(effects.refresh).toHaveBeenCalledWith("test", { bypassCache: true });
  });

  it("preserves the analyst authorization requirement for same-origin overrides", async () => {
    const response = await overrides(new Request("https://app.example/api/match/test/overrides", {
      method: "POST", headers: { origin: "https://app.example" }, body: "{}",
    }), { params: Promise.resolve({ id: "test" }) });
    expect(response.status).toBe(401);
    expect(effects.analyst).toHaveBeenCalledOnce();
    expect(effects.limit).not.toHaveBeenCalled();
  });
});
