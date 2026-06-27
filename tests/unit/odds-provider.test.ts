import { describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { TheOddsApiProvider } from "@/lib/providers/oddsApi";

function firstRequestedUrl(fetcher: ReturnType<typeof vi.fn>) {
  const calls = fetcher.mock.calls as unknown as Array<[URL | Request | string]>;
  return String(calls[0][0]);
}

describe("The Odds API provider", () => {
  it("selecciona la competición y normaliza outcomes al dominio interno", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            home_team: "Arsenal",
            away_team: "Liverpool",
            bookmakers: [
              {
                title: "Casa demo",
                last_update: "2026-06-25T18:00:00Z",
                markets: [
                  {
                    key: "h2h",
                    outcomes: [
                      { name: "Arsenal", price: 2.4 },
                      { name: "Draw", price: 3.5 },
                      { name: "Liverpool", price: 2.9 },
                    ],
                  },
                  {
                    key: "totals",
                    outcomes: [
                      { name: "Over", price: 1.95, point: 2.5 },
                      { name: "Under", price: 1.9, point: 2.5 },
                    ],
                  },
                ],
              },
            ],
          },
        ]),
        { status: 200 },
      ),
    );
    const match = structuredClone(demoDataset.match);
    match.homeTeam = { ...match.homeTeam, name: "Arsenal" };
    match.awayTeam = { ...match.awayTeam, name: "Liverpool" };
    match.competition = {
      id: "premier-league",
      name: "Premier League",
      kind: "CLUB",
    };
    const provider = new TheOddsApiProvider("test-key", fetcher);

    const result = await provider.getOdds(match);
    const requestedUrl = firstRequestedUrl(fetcher);

    expect(requestedUrl).toContain("/sports/soccer_epl/odds");
    expect(result.data.map((odd) => odd.outcome)).toEqual([
      "Arsenal",
      "Empate",
      "Liverpool",
      "Más de 2.5",
      "Menos de 2.5",
    ]);
  });

  it("no consulta una competición sin sport key conocido", async () => {
    const fetcher = vi.fn();
    const match = structuredClone(demoDataset.match);
    match.competition = {
      id: "unknown-league",
      name: "Liga desconocida",
      kind: "CLUB",
    };
    const provider = new TheOddsApiProvider("test-key", fetcher);

    await expect(provider.getOdds(match)).rejects.toThrow(
      /competición no soportada/i,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
