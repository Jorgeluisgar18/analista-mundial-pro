import { describe, expect, it, vi } from "vitest";
import { TheSportsDbClient } from "@/lib/providers/theSportsDb";
import { TheSportsDbEnrichmentProvider } from "@/lib/providers/theSportsDb";
import { demoDataset } from "@/data/demo";

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

  it("enriquece un dataset con badges de equipos y detalle de evento", async () => {
    const fetcher = vi.fn(async (input: URL | Request | string) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/eventsday.php")) {
        return Response.json({
          events: [
            {
              idEvent: "tsdb-event-1",
              strEvent: "Colombia vs Brazil",
              strHomeTeam: "Colombia",
              strAwayTeam: "Brazil",
              dateEvent: "2026-06-15",
              strVenue: "MetLife Stadium",
              strCity: "East Rutherford",
              strCountry: "United States",
              strThumb: "https://img.example/event.jpg",
            },
          ],
        });
      }
      if (url.pathname.endsWith("/searchteams.php")) {
        const team = url.searchParams.get("t");
        return Response.json({
          teams: [
            {
              idTeam: team === "Colombia" ? "1" : "2",
              strTeam: team === "Brasil" ? "Brazil" : team,
              strTeamBadge:
                team === "Colombia"
                  ? "https://img.example/colombia.png"
                  : "https://img.example/brazil.png",
              strCountry: team === "Colombia" ? "Colombia" : "Brazil",
              strStadium:
                team === "Colombia" ? "Estadio Metropolitano" : "Maracana",
            },
          ],
        });
      }
      return Response.json({});
    });
    const provider = new TheSportsDbEnrichmentProvider({
      apiKey: "123",
      baseUrl: "https://www.thesportsdb.com/api/v1/json",
      timeoutMs: 8000,
      fetcher: fetcher as typeof fetch,
    });

    const result = await provider.enrich(structuredClone(demoDataset));

    expect(result.data.match.homeTeam.logoUrl).toBe(
      "https://img.example/colombia.png",
    );
    expect(result.data.match.awayTeam.logoUrl).toBe(
      "https://img.example/brazil.png",
    );
    expect(result.data.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "thesportsdb-enrichment",
          status: "confirmed",
          detail: expect.stringContaining("escudos"),
        }),
      ]),
    );
  });

  it("evita enriquecer equipos por tokens genericos compartidos", async () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam = {
      ...dataset.match.homeTeam,
      name: "Manchester United",
      logoUrl: undefined,
    };
    dataset.match.awayTeam = {
      ...dataset.match.awayTeam,
      name: "Real Madrid",
      logoUrl: undefined,
    };
    const fetcher = vi.fn(async (input: URL | Request | string) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/eventsday.php")) {
        return Response.json({ events: [] });
      }
      if (url.pathname.endsWith("/searchteams.php")) {
        const team = url.searchParams.get("t");
        return Response.json({
          teams: [
            {
              idTeam: team === "Manchester United" ? "wrong-1" : "wrong-2",
              strTeam:
                team === "Manchester United" ? "United" : "Real",
              strTeamBadge:
                team === "Manchester United"
                  ? "https://img.example/leeds.png"
                  : "https://img.example/sociedad.png",
            },
          ],
        });
      }
      return Response.json({});
    });
    const provider = new TheSportsDbEnrichmentProvider({
      apiKey: "123",
      baseUrl: "https://www.thesportsdb.com/api/v1/json",
      timeoutMs: 8000,
      fetcher: fetcher as typeof fetch,
    });

    const result = await provider.enrich(dataset);

    expect(result.data.match.homeTeam.logoUrl).toBeUndefined();
    expect(result.data.match.awayTeam.logoUrl).toBeUndefined();
  });
});
