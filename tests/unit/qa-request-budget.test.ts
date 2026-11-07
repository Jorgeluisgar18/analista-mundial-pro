import { describe, expect, it, vi } from "vitest";
import { resilientFetch } from "@/lib/providers/http";
import { createQaRequestBudget } from "../../scripts/lib/qaRequestBudget";
import { parseQaOptions, qaExitCode, runQaRound } from "../../scripts/qa-real-api-football";

describe("QA request budget", () => {
  it("blocks automatic redirects even when the caller requests follow mode", async () => {
    const underlying = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}));
    const budget = createQaRequestBudget(underlying);
    await budget.fetcher("https://example.test", { redirect: "follow" });
    expect(underlying).toHaveBeenCalledWith("https://example.test", { redirect: "error" });
    expect(budget.snapshot().attempts).toBe(1);
  });

  it("counts a successful HTTP attempt before dispatch", async () => {
    const underlying = vi.fn<typeof fetch>().mockImplementation(async () => {
      expect(budget.snapshot().attempts).toBe(1);
      return Response.json({});
    });
    const budget = createQaRequestBudget(underlying);
    await budget.fetcher("https://example.test");
    expect(budget.snapshot()).toEqual({ attempts: 1, limit: 20, remaining: 19, exhausted: false });
  });

  it("counts a retry after a transient HTTP response", async () => {
    const underlying = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({}));
    const budget = createQaRequestBudget(underlying);
    await resilientFetch(budget.fetcher, "https://example.test", { retryDelayMs: 0 });
    expect(budget.snapshot().attempts).toBe(2);
  });

  it("counts network failures even when no response reaches usage reporting", async () => {
    const underlying = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    const budget = createQaRequestBudget(underlying);
    await expect(resilientFetch(budget.fetcher, "https://example.test", { retryDelayMs: 0 })).rejects.toThrow();
    expect(underlying).toHaveBeenCalledTimes(2);
    expect(budget.snapshot().attempts).toBe(2);
  });

  it.each([401, 429])("retains the no-retry policy for HTTP %i", async (status) => {
    const underlying = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
    const budget = createQaRequestBudget(underlying);
    expect((await resilientFetch(budget.fetcher, "https://example.test")).status).toBe(status);
    expect(budget.snapshot().attempts).toBe(1);
  });

  it("blocks the retry after attempt 20 and keeps exhaustion across operations", async () => {
    const underlying = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}));
    const budget = createQaRequestBudget(underlying);
    for (let i = 0; i < 19; i += 1) await budget.fetcher("https://example.test");
    underlying.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(resilientFetch(budget.fetcher, "https://example.test", { retryDelayMs: 0 })).rejects.toThrow(/budget exhausted/);
    await expect(budget.fetcher("https://example.test/another-operation")).rejects.toThrow(/budget exhausted/);
    expect(underlying).toHaveBeenCalledTimes(20);
    expect(budget.snapshot()).toEqual({ attempts: 20, limit: 20, remaining: 0, exhausted: true });
  });

  it("never dispatches more than 20 overlapping requests", async () => {
    const underlying = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({}));
    const budget = createQaRequestBudget(underlying);
    const results = await Promise.allSettled(Array.from({ length: 30 }, () => budget.fetcher("https://example.test")));
    expect(underlying).toHaveBeenCalledTimes(20);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(10);
    expect(budget.snapshot().attempts).toBe(20);
  });

  it.each([0, -1, 1.5, 21, NaN, Infinity])("rejects invalid limit %s", (limit) => {
    expect(() => createQaRequestBudget(vi.fn<typeof fetch>(), limit)).toThrow(/1 to 20/);
  });

  it("shares one budget between the fixture list and detail requests", async () => {
    const fixture = {
      fixture: { id: 99, date: "2026-10-24T18:00:00Z", status: { short: "NS" }, venue: { name: "Test", city: "Test" } },
      league: { id: 39, name: "Premier League", round: "Round 1", country: "England", season: 2026 },
      teams: { home: { id: 10, name: "Home" }, away: { id: 20, name: "Away" } },
    };
    const underlying = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ response: [fixture] }));
    const report = await runQaRound({ date: "2026-10-24", competitions: ["all"], limit: 2 }, "fake-secret", underlying);
    expect(underlying).toHaveBeenCalledTimes(2);
    expect(report.budget.attempts).toBe(2);
    expect(report.budget.exhausted).toBe(true);
    expect(report.checks[0]).toMatchObject({ step: "list", count: 1 });
  });

  it("excludes provider errors, API keys and headers from the round report", async () => {
    const secret = "fake-private-key";
    const underlying = vi.fn<typeof fetch>().mockRejectedValue(new Error(secret));
    const report = await runQaRound({ date: "2026-10-24", competitions: ["all"], limit: 20 }, secret, underlying);
    expect(report.checks).toEqual([{ competition: "all", step: "request", status: "failed" }]);
    expect(report.budget.attempts).toBe(2);
    expect(JSON.stringify(report)).not.toContain(secret);
    expect(JSON.stringify(report)).not.toContain("x-apisports-key");
  });
});

describe("QA CLI inputs", () => {
  it.each([401, 429])("fails QA when secondary detail requests return HTTP %i", async (status) => {
    const fixture = {
      fixture: { id: 99, date: "2026-10-24T18:00:00Z", status: { short: "NS" }, venue: {} },
      league: { id: 39, name: "Premier League", country: "England", season: 2026 },
      teams: { home: { id: 10, name: "Home" }, away: { id: 20, name: "Away" } },
    };
    const underlying = vi.fn<typeof fetch>().mockImplementation(async (input) =>
      new URL(String(input)).pathname === "/fixtures"
        ? Response.json({ response: [fixture] })
        : new Response("fake-private-key", { status }),
    );
    const report = await runQaRound(
      { date: "2026-10-24", competitions: ["all"], limit: 20 }, "fake-key", underlying,
    );
    expect(underlying).toHaveBeenCalledTimes(6);
    expect(report.checks).toEqual([
      { competition: "all", step: "list", status: "available", count: 1 },
      { competition: "all", step: "detail", status: "provider-warning" },
    ]);
    expect(qaExitCode(report)).toBe(1);
    expect(JSON.stringify(report)).not.toContain("fake-private-key");
  });

  it.each([401, 429])("reports HTTP %i safely and selects a failing CLI exit code", async (status) => {
    const underlying = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response("fake-private-key", { status }),
    );
    const report = await runQaRound(
      { date: "2026-10-24", competitions: ["all"], limit: 20 },
      "fake-private-key",
      underlying,
    );
    expect(underlying).toHaveBeenCalledTimes(1);
    expect(report.budget.attempts).toBe(1);
    expect(report.checks).toEqual([{ competition: "all", step: "request", status: "failed" }]);
    expect(qaExitCode(report)).toBe(1);
    expect(JSON.stringify(report)).not.toContain("fake-private-key");
  });

  it("records requested competitions skipped after budget exhaustion", async () => {
    const underlying = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ response: [] }));
    const report = await runQaRound(
      { date: "2026-10-24", competitions: ["all", "premier-league", "la-liga"], limit: 1 },
      "fake-key",
      underlying,
    );
    expect(underlying).toHaveBeenCalledTimes(1);
    expect(report.checks).toEqual([
      { competition: "all", step: "list", status: "empty", count: 0 },
      { competition: "premier-league", step: "list", status: "skipped-budget" },
      { competition: "la-liga", step: "list", status: "skipped-budget" },
    ]);
    expect(qaExitCode(report)).toBe(1);
  });

  it("keeps a successful empty list distinct from a failed QA round", async () => {
    const underlying = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ response: [] }));
    const report = await runQaRound(
      { date: "2026-10-24", competitions: ["all"], limit: 20 },
      "fake-key",
      underlying,
    );
    expect(report.checks).toEqual([{ competition: "all", step: "list", status: "empty", count: 0 }]);
    expect(qaExitCode(report)).toBe(0);
  });

  it("provides help without credentials or live opt-in", () => {
    expect(parseQaOptions(["--help"])).toEqual({ help: true });
  });

  it("requires explicit live opt-in and a real calendar date", () => {
    expect(() => parseQaOptions(["--date", "2026-10-24", "--competition", "all"])).toThrow(/allow-live/);
    expect(() => parseQaOptions(["--date", "2026-02-30", "--competition", "all", "--allow-live"])).toThrow(/valid --date/);
    expect(() => parseQaOptions(["--date", "2026-10-24", "--competition", "all", "--max-requests", "21", "--allow-live"])).toThrow(/1 to 20/);
    expect(parseQaOptions(["--date", "2026-10-24", "--competition", "all", "--allow-live"])).toMatchObject({ limit: 20, competitions: ["all"] });
  });
});
