import { describe, expect, it, vi } from "vitest";
import { TheSportsDbClient } from "@/lib/providers/theSportsDb";

describe("TheSportsDB client", () => {
  it("treats null event roots as an empty result", async () => {
    const fetcher = vi.fn(async () => Response.json({ events: null }));
    const client = new TheSportsDbClient({
      apiKey: "123",
      baseUrl: "https://www.thesportsdb.com/api/v1/json",
      timeoutMs: 8000,
      fetcher,
    });

    await expect(client.eventsByDay("2026-06-27")).resolves.toEqual([]);
  });

  it("fails clearly on rate limiting", async () => {
    const fetcher = vi.fn(async () => new Response("rate", { status: 429 }));
    const client = new TheSportsDbClient({
      apiKey: "123",
      baseUrl: "https://www.thesportsdb.com/api/v1/json",
      timeoutMs: 8000,
      fetcher,
    });

    await expect(client.eventsByDay("2026-06-27")).rejects.toThrow(
      "TheSportsDB rate limit reached",
    );
  });
});
