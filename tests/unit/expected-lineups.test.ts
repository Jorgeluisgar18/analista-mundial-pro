import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo";
import { withExpectedLineups } from "@/lib/lineups/expectedLineups";

describe("expected lineups", () => {
  it("does not infer an expected XI for a finished match without provider lineups", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.status = "finished";
    dataset.lineups = [];
    dataset.players = [];

    const enriched = withExpectedLineups(dataset);

    expect(enriched.lineups).toHaveLength(2);
    expect(enriched.lineups.every((lineup) => lineup.status === "unavailable")).toBe(
      true,
    );
    expect(
      enriched.sources.some((source) => source.id === "expected-lineups"),
    ).toBe(false);
  });

  it("does not persist visual slot placeholders as player names", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam = {
      ...dataset.match.homeTeam,
      id: "home-empty-lineup",
      name: "Local sin once",
    };
    dataset.match.awayTeam = {
      ...dataset.match.awayTeam,
      id: "away-empty-lineup",
      name: "Visitante sin once",
    };
    dataset.lineups = [];
    dataset.players = [];
    dataset.availability = [];

    const enriched = withExpectedLineups(dataset);

    expect(enriched.lineups).toHaveLength(2);
    for (const lineup of enriched.lineups) {
      expect(lineup.status).toBe("expected");
      expect(lineup.confirmed).toBe(false);
      expect(lineup.formation.value).toBe("4-2-3-1");
      expect(lineup.formation.status).toBe("expected");
      expect(lineup.starters).toEqual([]);
    }
    expect(enriched.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "expected-lineups",
          status: "expected",
        }),
      ]),
    );
  });

  it("builds transparent expected starters when official lineups are unavailable", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam.id = "home";
    dataset.match.awayTeam.id = "away";
    dataset.lineups = [
      {
        teamId: "home",
        formation: {
          value: "Dato no disponible en la fuente actual",
          status: "unavailable",
          sourceType: "provider",
          source: "Provider",
          observedAt: "2026-07-02T12:00:00.000Z",
        },
        confirmed: false,
        starters: [],
      },
      {
        teamId: "away",
        formation: {
          value: "Dato no disponible en la fuente actual",
          status: "unavailable",
          sourceType: "provider",
          source: "Provider",
          observedAt: "2026-07-02T12:00:00.000Z",
        },
        confirmed: false,
        starters: [],
      },
    ];
    dataset.players = [
      {
        id: "keeper",
        teamId: "home",
        name: "Arquero titular",
        position: "GK",
        starterStatus: "expected",
        shots: 0,
      },
      {
        id: "injured",
        teamId: "home",
        name: "Delantero lesionado",
        position: "ST",
        starterStatus: "expected",
        goalProbability: 0.9,
      },
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `home-${index}`,
        teamId: "home",
        name: `Titular ${index + 1}`,
        position: index < 4 ? "DF" : index < 7 ? "MF" : "FW",
        starterStatus: "expected" as const,
        goalProbability: 0.2 - index * 0.01,
      })),
    ];
    dataset.availability = [
      {
        id: "injured-row",
        teamId: "home",
        player: "Delantero lesionado",
        type: "injured",
        impact: "No debe entrar al XI esperado.",
        evidence: {
          value: "Lesionado",
          status: "expected",
          sourceType: "provider",
          source: "Provider",
          observedAt: "2026-07-02T12:00:00.000Z",
        },
      },
    ];

    const enriched = withExpectedLineups(dataset);
    const homeLineup = enriched.lineups.find((lineup) => lineup.teamId === "home");

    expect(homeLineup?.confirmed).toBe(false);
    expect(homeLineup?.formation.status).toBe("expected");
    expect(homeLineup?.formation.value).toBe("4-2-3-1");
    expect(homeLineup?.starters).toHaveLength(11);
    expect(homeLineup?.starters).toContain("Arquero titular");
    expect(homeLineup?.starters).not.toContain("Delantero lesionado");
    expect(enriched.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "expected-lineups",
          status: "expected",
        }),
      ]),
    );
  });

  it("keeps incomplete official lineups as official-partial and fills missing slots safely", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam.id = "home";
    dataset.lineups = [
      {
        teamId: "home",
        formation: {
          value: "4-3-3",
          status: "confirmed",
          sourceType: "provider",
          source: "API-Football",
          observedAt: "2026-07-02T12:00:00.000Z",
        },
        confirmed: true,
        starters: ["Arquero oficial", "Lateral oficial"],
      },
    ];
    dataset.players = Array.from({ length: 10 }, (_, index) => ({
      id: `fallback-${index}`,
      teamId: "home",
      name: `Complemento ${index + 1}`,
      position: index < 3 ? "DF" : index < 6 ? "MF" : "FW",
      starterStatus: "expected" as const,
      goalProbability: 0.2 - index * 0.01,
    }));

    const enriched = withExpectedLineups(dataset);
    const lineup = enriched.lineups[0];

    expect(lineup.status).toBe("official-partial");
    expect(lineup.confirmed).toBe(false);
    expect(lineup.formation.status).toBe("confirmed");
    expect(lineup.starters).toHaveLength(11);
    expect(lineup.starters.slice(0, 2)).toEqual([
      "Arquero oficial",
      "Lateral oficial",
    ]);
    expect(enriched.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "partial-official-lineups",
          status: "expected",
        }),
      ]),
    );
  });
});
