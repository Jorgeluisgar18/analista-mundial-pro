import { describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { createHistoricalSignalService } from "@/lib/services/historicalSignalService";

vi.mock("server-only", () => ({}));

describe("historicalSignalService", () => {
  it("inyecta Elo histórico calculado al enriquecer un partido", async () => {
    const teams = [
      { id: "alpha-db", name: "Alpha Elo", externalId: "alpha-ext" },
      { id: "beta-db", name: "Beta Elo", externalId: "beta-ext" },
    ];
    const priorMatch = {
      id: "prior-db",
      kickoff: new Date("2025-01-01T00:00:00Z"),
      kickoffDate: "2025-01-01",
      homeTeamId: "alpha-db",
      awayTeamId: "beta-db",
      homeGoals: 3,
      awayGoals: 0,
      homeTeam: teams[0],
      awayTeam: teams[1],
    };
    const fakeDatabase = {
      team: {
        async findMany({ where }: { where: { OR: Array<Record<string, unknown>> } }) {
          const serialized = JSON.stringify(where.OR).toLowerCase();
          return teams.filter((team) =>
            serialized.includes(team.name.toLowerCase()),
          );
        },
      },
      historicalTeamMatch: {
        async groupBy() {
          return teams.map((team) => ({
            teamId: team.id,
            _count: { teamId: 1 },
          }));
        },
        async findMany({ where }: { where: { teamId: string } }) {
          if (where.teamId === "alpha-db") {
            return [
              {
                isHome: true,
                goalsFor: 3,
                goalsAgainst: 0,
                opponentElo: 1500,
                historicalMatch: priorMatch,
              },
            ];
          }
          return [
            {
              isHome: false,
              goalsFor: 0,
              goalsAgainst: 3,
              opponentElo: 1500,
              historicalMatch: priorMatch,
            },
          ];
        },
      },
      historicalMatch: {
        async findMany() {
          return [priorMatch];
        },
      },
      calibrationRun: {
        async findFirst() {
          return null;
        },
      },
    };
    const dataset = structuredClone(demoDataset);
    dataset.match.dataOrigin = "API";
    dataset.match.kickoff = "2025-03-01T00:00:00Z";
    dataset.match.homeTeam.name = "Alpha Elo";
    dataset.match.awayTeam.name = "Beta Elo";
    dataset.home.elo = 1500;
    dataset.away.elo = 1500;

    const enriched = await createHistoricalSignalService(
      fakeDatabase as never,
    ).enrich(dataset);

    expect(enriched.home.elo).toBeGreaterThan(1500);
    expect(enriched.away.elo).toBeLessThan(1500);
    expect(enriched.sources.at(-1)?.detail).toMatch(/Elo actual/i);
  });

  it("inyecta modelConfig persistido desde la ultima CalibrationRun", async () => {
    const teams = [
      { id: "alpha-db", name: "Alpha Cal", externalId: "alpha-ext" },
      { id: "beta-db", name: "Beta Cal", externalId: "beta-ext" },
    ];
    const fakeDatabase = {
      team: {
        async findMany() {
          return teams;
        },
      },
      historicalTeamMatch: {
        async groupBy() {
          return [];
        },
        async findMany() {
          return [];
        },
      },
      historicalMatch: {
        async findMany() {
          return [];
        },
      },
      calibrationRun: {
        async findFirst() {
          return {
            id: "calibration-run-1",
            modelName: "AMP ensemble",
            modelVersion: "1.1.0",
            sampleSize: 120,
            brier: 0.5,
            logLoss: 1.02,
            rps: 0.18,
            empiricalHome: 0.44,
            empiricalDraw: 0.29,
            empiricalAway: 0.27,
            config: JSON.stringify({
              dixonColesRho: -0.08,
              modelConfig: {
                label: "backtest-1.1.0-120",
                weights: {
                  dixonColes: 0.7,
                  simulation: 0.15,
                  logistic: 0.15,
                },
              },
            }),
            createdAt: new Date("2026-07-12T12:00:00.000Z"),
          };
        },
      },
    };
    const dataset = structuredClone(demoDataset);
    dataset.match.dataOrigin = "API";
    dataset.match.homeTeam.name = "Alpha Cal";
    dataset.match.awayTeam.name = "Beta Cal";

    const enriched = await createHistoricalSignalService(
      fakeDatabase as never,
    ).enrich(dataset);

    expect(enriched.historical?.calibration?.modelConfig).toMatchObject({
      label: "backtest-1.1.0-120",
      weights: {
        dixonColes: 0.7,
        simulation: 0.15,
        logistic: 0.15,
      },
    });
  });
});
