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
  date = "2026-08-15T14:00:00Z",
) {
  return {
    fixture: {
      id,
      date,
      status: { short: "NS" },
      venue: { name: "Estadio", city: "Ciudad" },
      referee: null,
    },
    league: { ...league, round: "Jornada 1", season: 2026 },
    teams: {
      home: {
        id: id * 10,
        name: `Local ${id}`,
        code: "LOC",
        logo: `https://media.api-sports.io/football/teams/${id * 10}.png`,
      },
      away: {
        id: id * 10 + 1,
        name: `Visitante ${id}`,
        code: "VIS",
        logo: `https://media.api-sports.io/football/teams/${id * 10 + 1}.png`,
      },
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
    expect(resolveApiFootballLeague("premier-league")).toBe(39);
    expect(resolveApiFootballLeague("champions-league")).toBe(2);
    expect(resolveApiFootballLeague("europa-league")).toBe(3);
    expect(resolveApiFootballLeague("la-liga")).toBe(140);
    expect(resolveApiFootballLeague("bundesliga")).toBe(78);
    expect(resolveApiFootballLeague("serie-a")).toBe(135);
    expect(resolveApiFootballLeague("ligue-1")).toBe(61);
    expect(resolveApiFootballLeague("123")).toBe(123);
  });
});

describe("filtros por proveedor", () => {
  it("API-Football no envía el slug como league y filtra la respuesta", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        response: [
          apiFixture(
            1,
            {
              id: 39,
              name: "Premier League",
              country: "England",
            },
            "2024-08-15T14:00:00Z",
          ),
          apiFixture(
            2,
            {
              id: 140,
              name: "La Liga",
              country: "Spain",
            },
            "2024-08-15T14:00:00Z",
          ),
        ],
      }),
    );
    const provider = new ApiFootballProvider("test", fetcher as typeof fetch);

    const result = await provider.listMatches(
      "2024-08-15",
      "premier-league",
    );
    const requestedUrl = firstRequestedUrl(fetcher);

    expect(requestedUrl.searchParams.get("timezone")).toBe("America/Bogota");
    expect(requestedUrl.searchParams.get("league")).toBe("39");
    expect(requestedUrl.searchParams.get("season")).toBe("2024");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].competition.name).toBe("Premier League");
    expect(result.data[0].homeTeam.logoUrl).toBe(
      "https://media.api-sports.io/football/teams/10.png",
    );
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

    expect(requestedUrl.searchParams.has("league")).toBe(false);
    expect(requestedUrl.searchParams.has("season")).toBe(false);
    expect(requestedUrl.searchParams.get("timezone")).toBe("America/Bogota");
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
    expect(requestedUrl.searchParams.get("dateFrom")).toBe("2026-08-15");
    expect(requestedUrl.searchParams.get("dateTo")).toBe("2026-08-16");
  });

  it("Football-Data conserva solo partidos que caen en el día Colombia solicitado", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        matches: [
          {
            id: 10,
            utcDate: "2026-08-16T02:30:00Z",
            status: "SCHEDULED",
            stage: "Jornada 1",
            competition: {
              id: 2021,
              name: "Premier League",
              area: { name: "England" },
            },
            homeTeam: {
              id: 1,
              name: "Home",
              tla: "HOM",
              crest: "https://crests.football-data.org/1.png",
            },
            awayTeam: {
              id: 2,
              name: "Away",
              tla: "AWA",
              crest: "https://crests.football-data.org/2.png",
            },
          },
          {
            id: 11,
            utcDate: "2026-08-16T12:00:00Z",
            status: "SCHEDULED",
            stage: "Jornada 1",
            competition: {
              id: 2021,
              name: "Premier League",
              area: { name: "England" },
            },
            homeTeam: { id: 3, name: "Later Home", tla: "LHO" },
            awayTeam: { id: 4, name: "Later Away", tla: "LAW" },
          },
        ],
      }),
    );
    const provider = new FootballDataProvider("test", fetcher as typeof fetch);

    const result = await provider.listMatches("2026-08-15", "premier-league");

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("10");
    expect(result.data[0]?.date).toBe("2026-08-15");
    expect(result.data[0]?.time).toBe("21:30");
    expect(result.data[0]?.timezone).toBe("America/Bogota");
    expect(result.data[0]?.homeTeam.logoUrl).toBe(
      "https://crests.football-data.org/1.png",
    );
  });
});
