import { describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { TheOddsApiProvider } from "@/lib/providers/oddsApi";

function requestedUrl(fetcher: ReturnType<typeof vi.fn>, index: number) {
  const calls = fetcher.mock.calls as unknown as Array<[URL | Request | string]>;
  return String(calls[index][0]);
}

function response(body: unknown, headers?: HeadersInit, status = 200) {
  return new Response(JSON.stringify(body), { headers, status });
}

function premierLeagueMatch() {
  const match = structuredClone(demoDataset.match);
  match.homeTeam = { ...match.homeTeam, name: "Arsenal" };
  match.awayTeam = { ...match.awayTeam, name: "Liverpool" };
  match.kickoff = "2026-08-15T19:00:00.000Z";
  match.competition = {
    id: "premier-league",
    name: "Premier League",
    kind: "CLUB",
  };
  return match;
}

describe("The Odds API provider", () => {
  it("usa /events gratis antes de pedir cuotas del evento exacto", async () => {
    const usageReporter = vi.fn();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response([
          {
            id: "event-123",
            sport_key: "soccer_epl",
            sport_title: "EPL",
            commence_time: "2026-08-15T19:00:00Z",
            home_team: "Arsenal FC",
            away_team: "Liverpool",
          },
        ]),
      )
      .mockResolvedValueOnce(
        response(
          {
            id: "event-123",
            sport_key: "soccer_epl",
            sport_title: "EPL",
            commence_time: "2026-08-15T19:00:00Z",
            home_team: "Arsenal FC",
            away_team: "Liverpool",
            bookmakers: [
              {
                title: "Casa demo",
                markets: [
                  {
                    key: "h2h",
                    last_update: "2026-08-15T18:30:00Z",
                    outcomes: [
                      { name: "Arsenal", price: 2.4 },
                      { name: "Draw", price: 3.5 },
                      { name: "Liverpool", price: 2.9 },
                    ],
                  },
                ],
              },
            ],
          },
          {
            "x-requests-used": "21",
            "x-requests-remaining": "479",
            "x-requests-last": "1",
          },
        ),
      );
    const provider = new TheOddsApiProvider(
      "test-key",
      fetcher,
      usageReporter,
    );

    const result = await provider.getOdds(premierLeagueMatch());

    expect(requestedUrl(fetcher, 0)).toContain("/sports/soccer_epl/events");
    expect(requestedUrl(fetcher, 1)).toContain(
      "/sports/soccer_epl/events/event-123/odds",
    );
    expect(requestedUrl(fetcher, 1)).toContain("markets=h2h");
    expect(requestedUrl(fetcher, 1)).toContain("regions=eu");
    expect(result.data.map((odd) => odd.outcome)).toEqual([
      "Arsenal",
      "Empate",
      "Liverpool",
    ]);
    expect(result.meta.quota).toEqual({
      used: 21,
      remaining: 479,
      limit: 500,
    });
    expect(usageReporter).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "The Odds API",
        period: "month",
        used: 21,
        remaining: 479,
        limit: 500,
      }),
    );
  });

  it("no consume endpoint de odds cuando /events no encuentra el partido", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      response([
        {
          id: "other-event",
          sport_key: "soccer_epl",
          sport_title: "EPL",
          commence_time: "2026-08-15T19:00:00Z",
          home_team: "Chelsea",
          away_team: "Tottenham",
        },
      ]),
    );
    const provider = new TheOddsApiProvider("test-key", fetcher);

    const result = await provider.getOdds(premierLeagueMatch());

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual([]);
    expect(result.meta.warnings.join(" ")).toMatch(/no se consumi[oó] cuota/i);
  });

  it("permite configurar markets, regiones, bookmakers y timeout", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response([
          {
            id: "event-123",
            sport_key: "soccer_epl",
            sport_title: "EPL",
            commence_time: "2026-08-15T19:00:00Z",
            home_team: "Arsenal",
            away_team: "Liverpool",
          },
        ]),
      )
      .mockResolvedValueOnce(response({ id: "event-123", bookmakers: [] }));
    const provider = new TheOddsApiProvider("test-key", fetcher, undefined, {
      regions: "eu,uk",
      markets: "h2h,totals",
      bookmakers: "bet365",
      timeoutMs: 12_000,
    });

    await provider.getOdds(premierLeagueMatch());

    const oddsUrl = requestedUrl(fetcher, 1);
    expect(oddsUrl).toContain("regions=eu%2Cuk");
    expect(oddsUrl).toContain("markets=h2h%2Ctotals");
    expect(oddsUrl).toContain("bookmakers=bet365");
  });

  it("devuelve unavailable sin llamar a la API pagada para competición sin sport key", async () => {
    const fetcher = vi.fn();
    const match = premierLeagueMatch();
    match.competition = {
      id: "unknown-league",
      name: "Liga desconocida",
      kind: "CLUB",
    };
    const provider = new TheOddsApiProvider("test-key", fetcher);

    const result = await provider.getOdds(match);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.meta.warnings.join(" ")).toMatch(/no soportada/i);
  });
});
