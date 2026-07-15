import { describe, expect, it, vi } from "vitest";
import { FootballdataIoProvider } from "@/lib/providers/footballdataIo";

function firstRequestedUrl(fetcher: ReturnType<typeof vi.fn>) {
  const calls = fetcher.mock.calls as unknown as Array<[URL | Request | string]>;
  return new URL(String(calls[0][0]));
}

describe("Footballdata.io provider", () => {
  it("consulta partidos por fecha con bearer auth y normaliza al horario Colombia", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          date: "2026-08-15",
          matches: [
            {
              match_id: 909,
              match_date: "2026-08-16T02:30:00Z",
              status: "scheduled",
              league: {
                id: 44,
                name: "Premier League",
                country: "England",
              },
              home_team: {
                id: 1,
                name: "Arsenal",
                short_name: "ARS",
                logo: "https://cdn.example/arsenal.png",
              },
              away_team: {
                id: 2,
                name: "Chelsea",
                short_name: "CHE",
                logo: "https://cdn.example/chelsea.png",
              },
              venue: {
                name: "Emirates Stadium",
                city: "London",
              },
            },
          ],
        },
        meta: {
          requests_used: 12,
          requests_limit: 2000,
        },
      }),
    );
    const reporter = vi.fn();
    const provider = new FootballdataIoProvider(
      "test-token",
      fetcher as typeof fetch,
      reporter,
    );

    const result = await provider.listMatches("2026-08-15", "premier-league");
    const requestedUrl = firstRequestedUrl(fetcher);

    expect(requestedUrl.toString()).toBe(
      "https://footballdata.io/api/v1/matches/date/2026-08-15?league=premier-league",
    );
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: "909",
        date: "2026-08-15",
        time: "21:30",
        timezone: "America/Bogota",
        venue: "Emirates Stadium",
        city: "London",
        country: "England",
      }),
    );
    expect(result.data[0]?.homeTeam.logoUrl).toBe(
      "https://cdn.example/arsenal.png",
    );
    expect(result.meta.quota).toEqual({ used: 12, limit: 2000 });
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "Footballdata.io",
        period: "month",
        used: 12,
        limit: 2000,
      }),
    );
  });

  it("convierte respuestas vacías en lista vacía sin romper fallback", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        success: true,
        data: null,
        meta: {
          requests_used: 1,
          requests_limit: 2000,
        },
      }),
    );
    const provider = new FootballdataIoProvider(
      "test-token",
      fetcher as typeof fetch,
    );

    await expect(provider.listMatches("2026-08-15")).resolves.toMatchObject({
      data: [],
      meta: {
        source: "Footballdata.io",
        warnings: [],
      },
    });
  });

  it("filtra localmente cuando el proveedor ignora slugs de liga", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          date: "2026-07-01",
          matches: [
            {
              match_id: 1,
              match_date: "2026-07-01T21:00:00Z",
              status: "scheduled",
              league: { id: 10, name: "International World Cup" },
              home_team: { id: 1, name: "Mexico" },
              away_team: { id: 2, name: "Ecuador" },
            },
            {
              match_id: 2,
              match_date: "2026-07-01T22:00:00Z",
              status: "scheduled",
              league: { id: 20, name: "Europe UEFA Champions League" },
              home_team: { id: 3, name: "Kairat" },
              away_team: { id: 4, name: "Sutjeska" },
            },
          ],
        },
        meta: {},
      }),
    );
    const provider = new FootballdataIoProvider(
      "test-token",
      fetcher as typeof fetch,
    );

    await expect(
      provider.listMatches("2026-07-01", "champions-league"),
    ).resolves.toMatchObject({
      data: [
        expect.objectContaining({
          id: "2",
          competition: expect.objectContaining({
            name: "Europe UEFA Champions League",
          }),
        }),
      ],
    });

    await expect(
      provider.listMatches("2026-07-01", "premier-league"),
    ).resolves.toMatchObject({
      data: [],
    });
  });

  it("construye un dataset de detalle con stats y probabilidades cuando el match existe", async () => {
    const fetcher = vi.fn(async (input: URL | Request | string) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/matches/909")) {
        return Response.json({
          success: true,
          data: {
            match_id: 909,
            match_date: "2026-08-16T02:30:00Z",
            status: "scheduled",
            league: { id: 44, name: "Premier League", country: "England" },
            home_team: {
              id: 1,
              name: "Arsenal",
              short_name: "ARS",
              logo: "https://cdn.example/arsenal.png",
            },
            away_team: {
              id: 2,
              name: "Chelsea",
              short_name: "CHE",
              logo: "https://cdn.example/chelsea.png",
            },
            venue: { name: "Emirates Stadium", city: "London" },
            referee: "Michael Oliver",
          },
          meta: { requests_used: 20, requests_limit: 2000 },
        });
      }
      if (url.pathname.endsWith("/matches/909/stats")) {
        return Response.json({
          success: true,
          data: {
            home: {
              goals_for_avg: 2.1,
              goals_against_avg: 0.9,
              shots_avg: 15,
              shots_on_target_avg: 5.8,
              corners_avg: 6.2,
              cards_avg: 1.8,
              clean_sheet_rate: 0.48,
            },
            away: {
              goals_for_avg: 1.7,
              goals_against_avg: 1.1,
              shots_avg: 12,
              shots_on_target_avg: 4.4,
              corners_avg: 5,
              cards_avg: 2.2,
              clean_sheet_rate: 0.35,
            },
          },
          meta: { requests_used: 21, requests_limit: 2000 },
        });
      }
      if (url.pathname.endsWith("/matches/909/probabilities")) {
        return Response.json({
          success: true,
          data: {
            home_win: 0.51,
            draw: 0.25,
            away_win: 0.24,
          },
          meta: { requests_used: 22, requests_limit: 2000 },
        });
      }
      return Response.json({ success: true, data: null, meta: {} });
    });
    const provider = new FootballdataIoProvider(
      "test-token",
      fetcher as typeof fetch,
    );

    const result = await provider.getMatch("909");

    expect(result.data?.match).toEqual(
      expect.objectContaining({
        id: "909",
        time: "21:30",
        venue: "Emirates Stadium",
      }),
    );
    expect(result.data?.home.goalsFor).toBe(2.1);
    expect(result.data?.away.shotsOnTarget).toBe(4.4);
    expect(result.data?.referee.value).toBe("Michael Oliver");
    expect(result.data?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "footballdata-io-match" }),
        expect.objectContaining({
          id: "footballdata-io-probabilities",
          detail: expect.stringContaining("51%"),
        }),
      ]),
    );
  });

  it("normaliza competiciones internacionales cuando el detalle trae liga genérica", async () => {
    const fetcher = vi.fn(async (input: URL | Request | string) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/matches/211657")) {
        return Response.json({
          success: true,
          data: {
            match_id: 211657,
            match_date: "2026-06-15T07:00:00Z",
            status: "finished",
            competition_name: "Competicion",
            country: "International",
            home_team: { id: 2056, name: "Sweden National Team" },
            away_team: { id: 2225, name: "Tunisia National Team" },
          },
          meta: {},
        });
      }
      return Response.json({ success: true, data: null, meta: {} });
    });
    const provider = new FootballdataIoProvider(
      "test-token",
      fetcher as typeof fetch,
    );

    const result = await provider.getMatch("211657");

    expect(result.data?.match.competition).toEqual(
      expect.objectContaining({
        name: "International World Cup",
        kind: "NATIONAL",
      }),
    );
  });
  it("no confirma stats cuando el proveedor solo devuelve objetos vacios", async () => {
    const fetcher = vi.fn(async (input: URL | Request | string) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/matches/910")) {
        return Response.json({
          success: true,
          data: {
            match_id: 910,
            match_date: "2026-08-16T02:30:00Z",
            league: { id: 44, name: "Premier League", country: "England" },
            home_team: { id: 1, name: "Arsenal" },
            away_team: { id: 2, name: "Chelsea" },
          },
          meta: {},
        });
      }
      if (url.pathname.endsWith("/matches/910/stats")) {
        return Response.json({
          success: true,
          data: { home: {}, away: {} },
          meta: {},
        });
      }
      return Response.json({ success: true, data: null, meta: {} });
    });
    const provider = new FootballdataIoProvider(
      "test-token",
      fetcher as typeof fetch,
    );

    const result = await provider.getMatch("910");
    const statsSource = result.data?.sources.find(
      (source) => source.id === "footballdata-io-stats",
    );

    expect(statsSource?.status).not.toBe("confirmed");
  });
});
