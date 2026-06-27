import { describe, expect, it, vi } from "vitest";
import { ApiFootballProvider } from "@/lib/providers/apiFootball";
import { FootballDataProvider } from "@/lib/providers/footballData";
import {
  resolveApiFootballLeague,
  resolveFootballDataCompetition,
  supportedCompetitions,
} from "@/lib/providers/competitionCatalog";

function apiFixture(
  id: number,
  league: { id: number; name: string; country: string },
) {
  return {
    fixture: {
      id,
      date: "2026-08-15T14:00:00Z",
      status: { short: "NS" },
      venue: { name: "Estadio", city: "Ciudad" },
      referee: null,
    },
    league: { ...league, round: "Jornada 1", season: 2026 },
    teams: {
      home: { id: id * 10, name: `Local ${id}`, code: "LOC" },
      away: { id: id * 10 + 1, name: `Visitante ${id}`, code: "VIS" },
    },
  };
}

function firstRequestedUrl(fetcher: ReturnType<typeof vi.fn>) {
  const calls = fetcher.mock.calls as unknown as Array<[URL | Request | string]>;
  return new URL(String(calls[0][0]));
}

describe("catálogo de competiciones", () => {
  it("expone las ligas objetivo y traduce slugs para Football-Data", () => {
    expect(supportedCompetitions.map((competition) => competition.slug)).toEqual(
      expect.arrayContaining([
        "wc-2026",
        "premier-league",
        "champions-league",
        "europa-league",
        "la-liga",
        "bundesliga",
        "serie-a",
        "ligue-1",
      ]),
    );
    expect(resolveFootballDataCompetition("premier-league")).toBe("PL");
    expect(resolveFootballDataCompetition("champions-league")).toBe("CL");
    expect(resolveApiFootballLeague("wc-2026")).toBe(1);
    expect(resolveApiFootballLeague("123")).toBe(123);
    expect(resolveApiFootballLeague("premier-league")).toBeUndefined();
  });
});

describe("filtros por proveedor", () => {
  it("API-Football no envía el slug como league y filtra la respuesta", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        response: [
          apiFixture(1, {
            id: 39,
            name: "Premier League",
            country: "England",
          }),
          apiFixture(2, {
            id: 140,
            name: "La Liga",
            country: "Spain",
          }),
        ],
      }),
    );
    const provider = new ApiFootballProvider("test", fetcher as typeof fetch);

    const result = await provider.listMatches(
      "2026-08-15",
      "premier-league",
    );
    const requestedUrl = firstRequestedUrl(fetcher);

    expect(requestedUrl.searchParams.has("league")).toBe(false);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].competition.name).toBe("Premier League");
  });

  it("API-Football usa IDs seguros conocidos para reducir búsquedas amplias", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        response: [
          apiFixture(1, {
            id: 1,
            name: "FIFA World Cup",
            country: "World",
          }),
        ],
      }),
    );
    const provider = new ApiFootballProvider("test", fetcher as typeof fetch);

    const result = await provider.listMatches("2026-06-15", "wc-2026");
    const requestedUrl = firstRequestedUrl(fetcher);

    expect(requestedUrl.searchParams.get("league")).toBe("1");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].competition.name).toBe("FIFA World Cup");
  });

  it("Football-Data traduce el slug al código competitions", async () => {
    const fetcher = vi.fn(async () => Response.json({ matches: [] }));
    const provider = new FootballDataProvider(
      "test",
      fetcher as typeof fetch,
    );

    await provider.listMatches("2026-08-15", "premier-league");
    const requestedUrl = firstRequestedUrl(fetcher);

    expect(requestedUrl.searchParams.get("competitions")).toBe("PL");
  });
});
