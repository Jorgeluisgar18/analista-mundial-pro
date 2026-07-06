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
  it("consulta Mundial 2026 por fecha amplia para evitar doble llamada de cuota", async () => {
    const fetcher = vi.fn(async () =>
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

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(requestUrl(fetcher, 0).searchParams.has("league")).toBe(false);
    expect(requestUrl(fetcher, 0).searchParams.has("season")).toBe(false);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].competition.name).toBe("FIFA World Cup");
  });

  it("omite ligas top 2026 en API-Football free para delegar a proveedores complementarios", async () => {
    const fetcher = vi.fn(async () => Response.json({ response: [] }));
    const provider = new ApiFootballProvider("test", fetcher as typeof fetch);

    const result = await provider.listMatches("2026-08-15", "premier-league");

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.meta.warnings.join(" ")).toMatch(/plan gratuito/i);
  });
});
