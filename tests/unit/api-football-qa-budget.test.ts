import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProviderRegistry } from "@/lib/providers/providerRegistry";

vi.mock("@/lib/services/apiUsageService", () => ({ recordApiUsage: vi.fn() }));

function fixtures(status = 200) {
  return new Response(JSON.stringify({ response: [] }), { status });
}

describe("API-Football local QA budget", () => {
  beforeEach(() => {
    vi.stubGlobal("__analistaApiFootballQaBudget", undefined);
    vi.stubEnv("NETLIFY", undefined);
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function provider(limit?: string) {
    return createProviderRegistry({
      FOOTBALL_API_KEY: "qa-key-not-a-real-secret",
      API_FOOTBALL_QA_REQUEST_LIMIT: limit,
    }).football[0];
  }

  it("preserves requests without the opt-in budget", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => fixtures());
    vi.stubGlobal("fetch", fetcher);

    await provider().listMatches("2026-10-25");

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("shares twenty reservations across concurrent registry instances and blocks request 21", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => fixtures());
    vi.stubGlobal("fetch", fetcher);

    const results = await Promise.allSettled(
      Array.from({ length: 21 }, () => provider("20").listMatches("2026-10-25")),
    );

    expect(fetcher).toHaveBeenCalledTimes(20);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(20);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(console.info).toHaveBeenCalledTimes(20);
    expect(console.info).toHaveBeenLastCalledWith("API-Football QA", {
      pid: process.pid, attempts: 20, limit: 20, remaining: 0,
    });
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("qa-key");
  });

  it("counts a transient response and its retry separately", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(fixtures(503))
      .mockResolvedValueOnce(fixtures());
    vi.stubGlobal("fetch", fetcher);

    await provider("20").listMatches("2026-10-25");

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(console.info).toHaveBeenCalledTimes(2);
    expect(console.info).toHaveBeenLastCalledWith("API-Football QA", {
      pid: process.pid, attempts: 2, limit: 20, remaining: 18,
    });
  });

  it("counts failed network attempts even when retries are exhausted", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetcher);

    await expect(provider("20").listMatches("2026-10-25")).rejects.toThrow("network down");

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(console.info).toHaveBeenCalledTimes(2);
  });

  it("disables automatic redirects so one counted fetch cannot dispatch a redirect chain", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => fixtures());
    vi.stubGlobal("fetch", fetcher);

    await provider("20").listMatches("2026-10-25");

    expect(fetcher.mock.calls[0][1]?.redirect).toBe("error");
  });

  it("shares the budget between detail enrichment and match lists", async () => {
    const fixture = {
      fixture: { id: 99, date: "2026-10-26T22:00:00Z", status: { short: "NS" }, venue: {} },
      league: { id: 39, name: "Premier League", season: 2026 },
      teams: { home: { id: 10, name: "Home" }, away: { id: 20, name: "Away" } },
    };
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input));
      const body = url.pathname === "/fixtures" && url.searchParams.has("id") ? [fixture] : [];
      return Response.json({ response: body });
    });
    vi.stubGlobal("fetch", fetcher);

    expect((await provider("20").getMatch("99")).data?.match.id).toBe("99");
    expect(fetcher).toHaveBeenCalledTimes(5);
    for (let index = 0; index < 15; index += 1) {
      await provider("20").listMatches("2026-10-26");
    }
    await expect(provider("20").getMatch("99")).rejects.toThrow("budget exhausted");
    expect(fetcher).toHaveBeenCalledTimes(20);
    expect(console.info).toHaveBeenCalledTimes(20);
  });

  it("does not dispatch a retry after the last reservation is spent", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => fixtures(503));
    vi.stubGlobal("fetch", fetcher);

    await expect(provider("1").listMatches("2026-10-26")).rejects.toThrow("budget exhausted");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledTimes(1);
  });

  it("retains reservations after configuration removal and module reload", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => fixtures());
    vi.stubGlobal("fetch", fetcher);
    await provider("2").listMatches("2026-10-26");
    await provider().getMatch("99");
    expect(() => provider("20")).toThrow("cannot change");

    vi.resetModules();
    const { createProviderRegistry: reloaded } = await import("@/lib/providers/providerRegistry");
    const next = reloaded({ FOOTBALL_API_KEY: "qa-key-not-a-real-secret" }).football[0];
    await expect(next.listMatches("2026-10-26")).rejects.toThrow("budget exhausted");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(console.info).toHaveBeenCalledTimes(2);
  });

  it("leaves other providers unwrapped after the API-Football budget is exhausted", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(fixtures())
      .mockResolvedValueOnce(Response.json({ matches: [] }));
    vi.stubGlobal("fetch", fetcher);
    await provider("1").listMatches("2026-10-26");
    const other = createProviderRegistry({ FOOTBALL_DATA_API_KEY: "qa-key-not-a-real-secret" }).football[0];
    await other.listMatches("2026-10-26");

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][1]?.redirect).toBeUndefined();
    expect(console.info).toHaveBeenCalledTimes(1);
  });

  it.each(["0", "21", "1.5", "invalid"])("rejects invalid QA limit %s before sending requests", (limit) => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);

    expect(() => provider(limit)).toThrow("QA request limit");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
