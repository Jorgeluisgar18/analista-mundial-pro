import { afterEach, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { prisma } from "@/lib/db/prisma";
import { describeWithDatabase } from "../helpers/database";

vi.mock("server-only", () => ({}));

const externalIds = {
  competition: "competition-persistence-test",
  homeTeam: "home-persistence-test",
  awayTeam: "away-persistence-test",
  match: "match-persistence-test",
};

afterEach(async () => {
  await prisma.match.deleteMany({
    where: { externalId: externalIds.match },
  });
  await prisma.team.deleteMany({
    where: {
      externalId: {
        in: [externalIds.homeTeam, externalIds.awayTeam],
      },
    },
  });
  await prisma.competition.deleteMany({
    where: { externalId: externalIds.competition },
  });
});

describeWithDatabase("analysis persistence", () => {
  it("crea el partido externo antes de persistir snapshot y análisis", async () => {
    const analysisServiceModule = await import(
      "@/lib/services/analysisService"
    );
    const createAnalysisService = Reflect.get(
      analysisServiceModule,
      "createAnalysisService",
    ) as
      | ((options: {
          matchService: {
            getById: (id: string) => Promise<typeof demoDataset | null>;
          };
        }) => {
          getAnalysis: (
            id: string,
          ) => Promise<{ analysis: unknown; dataset: unknown } | null>;
        })
      | undefined;

    expect(createAnalysisService).toBeTypeOf("function");
    if (!createAnalysisService) return;

    const dataset = structuredClone(demoDataset);
    dataset.match = {
      ...dataset.match,
      id: externalIds.match,
      dataOrigin: "API",
      competition: {
        ...dataset.match.competition,
        id: externalIds.competition,
        name: "Competición de persistencia",
      },
      homeTeam: {
        ...dataset.match.homeTeam,
        id: externalIds.homeTeam,
        name: "Equipo local persistencia",
      },
      awayTeam: {
        ...dataset.match.awayTeam,
        id: externalIds.awayTeam,
        name: "Equipo visitante persistencia",
      },
    };
    dataset.lineups = [];
    dataset.players = [];
    dataset.availability = [];

    const service = createAnalysisService({
      matchService: {
        async getById(id) {
          return id === externalIds.match ? dataset : null;
        },
      },
    });
    const result = await service.getAnalysis(externalIds.match);
    const persisted = await prisma.match.findUnique({
      where: { externalId: externalIds.match },
      include: {
        competition: true,
        homeTeam: true,
        awayTeam: true,
        odds: true,
        snapshots: {
          include: { evidence: true },
        },
        analyses: {
          include: { predictions: true },
        },
      },
    });

    expect(result).not.toBeNull();
    expect(persisted?.competition.externalId).toBe(externalIds.competition);
    expect(persisted?.homeTeam.externalId).toBe(externalIds.homeTeam);
    expect(persisted?.awayTeam.externalId).toBe(externalIds.awayTeam);
    expect(persisted?.snapshots).toHaveLength(1);
    expect(persisted?.snapshots[0].evidence).toHaveLength(
      dataset.sources.length,
    );
    expect(persisted?.odds).toHaveLength(dataset.odds.length);
    expect(persisted?.analyses).toHaveLength(1);
    expect(persisted?.analyses[0].predictions.length).toBeGreaterThan(20);
  });
});
