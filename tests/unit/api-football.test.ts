import { describe, expect, it, vi } from "vitest";
import { ApiFootballProvider } from "@/lib/providers/apiFootball";

describe("ApiFootballProvider", () => {
  it("compone un dataset prepartido con fixture, equipos y alineaciones", async () => {
    const fixture = {
      fixture: {
        id: 99,
        date: "2026-06-15T22:00:00Z",
        status: { short: "NS" },
        venue: { name: "MetLife Stadium", city: "East Rutherford" },
        referee: null,
      },
      league: {
        id: 1,
        name: "FIFA World Cup",
        round: "Group D",
        country: "World",
        season: 2026,
      },
      teams: {
        home: { id: 10, name: "Colombia", code: "COL" },
        away: { id: 20, name: "Brazil", code: "BRA" },
      },
    };
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("fixtures/lineups")) {
        return Response.json({
          response: [
            {
              team: { id: 10 },
              formation: "4-2-3-1",
              startXI: [{ player: { name: "Jugador COL" } }],
            },
          ],
        });
      }
      if (url.includes("injuries")) return Response.json({ response: [] });
      if (url.includes("teams/statistics")) {
        const teamId = new URL(url).searchParams.get("team");
        const countStats =
          teamId === "10"
            ? {
                shots: { total: 96 },
                shots_on_target: { total: 40 },
                corners: { total: 48 },
                cards: { yellow: { total: 16 }, red: { total: 2 } },
                fouls: { total: 88 },
                offsides: { total: 12 },
              }
            : {
                shots: { total: 64 },
                shots_on_target: { total: 24 },
                corners: { total: 32 },
                cards: { yellow: { total: 10 }, red: { total: 0 } },
                fouls: { total: 72 },
                offsides: { total: 8 },
              };
        return Response.json({
          response: {
            fixtures: { played: { total: 8 }, wins: { total: 5 }, draws: { total: 2 } },
            goals: { for: { total: { total: 14 } }, against: { total: { total: 7 } } },
            clean_sheet: { total: 3 },
            ...countStats,
          },
        });
      }
      return Response.json({ response: [fixture] });
    });
    const provider = new ApiFootballProvider("test", fetcher as typeof fetch);
    const result = await provider.getMatch("99");
    expect(result.data?.match.id).toBe("99");
    expect(result.data?.match.date).toBe("2026-06-15");
    expect(result.data?.match.time).toBe("17:00");
    expect(result.data?.match.timezone).toBe("America/Bogota");
    expect(result.data?.lineups[0]?.formation.value).toBe("4-2-3-1");
    expect(result.data?.home.goalsFor).toBeCloseTo(1.75);
    expect(result.data?.home.shots).toBeCloseTo(12);
    expect(result.data?.home.shotsOnTarget).toBeCloseTo(5);
    expect(result.data?.home.corners).toBeCloseTo(6);
    expect(result.data?.home.cards).toBeCloseTo(2.25);
    expect(result.data?.home.fouls).toBeCloseTo(11);
    expect(result.data?.home.offsides).toBeCloseTo(1.5);
    expect(result.data?.away.shots).toBeCloseTo(8);
    expect(result.data?.away.shotsOnTarget).toBeCloseTo(3);
    expect(result.data?.away.corners).toBeCloseTo(4);
    expect(result.data?.away.cards).toBeCloseTo(1.25);
    expect(result.data?.away.fouls).toBeCloseTo(9);
    expect(result.data?.away.offsides).toBeCloseTo(1);
  });

  it("normaliza partidos nocturnos al día calendario de Colombia", async () => {
    const fixture = {
      fixture: {
        id: 100,
        date: "2026-06-16T02:30:00Z",
        status: { short: "NS" },
        venue: { name: "Estadio", city: "Ciudad" },
      },
      league: {
        id: 1,
        name: "FIFA World Cup",
        round: "Group D",
        country: "World",
        season: 2026,
      },
      teams: {
        home: { id: 10, name: "Colombia", code: "COL" },
        away: { id: 20, name: "Brazil", code: "BRA" },
      },
    };
    const fetcher = vi.fn(async () => Response.json({ response: [fixture] }));
    const provider = new ApiFootballProvider("test", fetcher as typeof fetch);

    const result = await provider.listMatches("2026-06-15", "wc-2026");
    const calls = fetcher.mock.calls as unknown as Array<[URL | Request | string]>;
    const requestedUrl = new URL(String(calls[0]?.[0]));

    expect(requestedUrl.searchParams.get("timezone")).toBe("America/Bogota");
    expect(requestedUrl.searchParams.has("league")).toBe(false);
    expect(requestedUrl.searchParams.has("season")).toBe(false);
    expect(result.data[0]?.date).toBe("2026-06-15");
    expect(result.data[0]?.time).toBe("21:30");
    expect(result.data[0]?.timezone).toBe("America/Bogota");
  });
});
