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
        return Response.json({
          response: {
            fixtures: { played: { total: 8 }, wins: { total: 5 }, draws: { total: 2 } },
            goals: { for: { total: { total: 14 } }, against: { total: { total: 7 } } },
            clean_sheet: { total: 3 },
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
