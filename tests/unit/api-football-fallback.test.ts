import { describe, expect, it, vi } from "vitest";
import { ApiFootballProvider } from "@/lib/providers/apiFootball";

function fixture(
  id: number,
  league: { id: number; name: string; country: string },
) {
  return {
    fixture: {
      id,
      date: "2026-06-15T22:00:00Z",
      status: { short: "NS" },
      venue: { name: "Estadio", city: "Ciudad" },
      referee: null,
    },
    league: { ...league, round: "Grupo D", season: 2026 },
    teams: {
      home: { id: id * 10, name: `Local ${id}`, code: "LOC" },
      away: { id: id * 10 + 1, name: `Visitante ${id}`, code: "VIS" },
    },
  };
}

function requestUrl(fetcher: ReturnType<typeof vi.fn>, callIndex: number) {
  return new URL(String(fetcher.mock.calls[callIndex][0]));
}

describe("fallback de fixtures API-Football", () => {
  it("reintenta Mundial 2026 sin league ID cuando el ID conocido no trae fixtures", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ response: [] }))
      .mockResolvedValueOnce(
        Response.json({
          response: [
            fixture(1, {
              id: 999,
              name: "FIFA World Cup",
              country: "World",
            }),
          ],
        }),
      );
    const provider = new ApiFootballProvider("test", fetcher as typeof fetch);

    const result = await provider.listMatches("2026-06-15", "wc-2026");

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(requestUrl(fetcher, 0).searchParams.get("league")).toBe("1");
    expect(requestUrl(fetcher, 1).searchParams.has("league")).toBe(false);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].competition.name).toBe("FIFA World Cup");
  });

  it("no duplica llamadas en ligas top si el league ID no trae fixtures", async () => {
    const fetcher = vi.fn(async () => Response.json({ response: [] }));
    const provider = new ApiFootballProvider("test", fetcher as typeof fetch);

    const result = await provider.listMatches("2026-08-15", "premier-league");

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(requestUrl(fetcher, 0).searchParams.get("league")).toBe("39");
    expect(result.data).toEqual([]);
  });
});
