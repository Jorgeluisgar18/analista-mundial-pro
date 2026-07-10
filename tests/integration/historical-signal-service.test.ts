import { afterEach, describe, expect, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { prisma } from "@/lib/db/prisma";
import { createHistoricalSignalService } from "@/lib/services/historicalSignalService";
import { itWithDatabase } from "../helpers/database";

vi.mock("server-only", () => ({}));

const ids = {
  competition: "elo-competition-test",
  import: "elo-import-test",
  alpha: "elo-alpha-test",
  beta: "elo-beta-test",
  priorMatch: "elo-prior-match-test",
  runtimeMatch: "elo-runtime-match-test",
};

async function cleanup() {
  await prisma.historicalMatch.deleteMany({
    where: {
      externalId: {
        in: [ids.priorMatch, `provider:${ids.runtimeMatch}`],
      },
    },
  });
  await prisma.historicalImport.deleteMany({
    where: {
      sourcePath: {
        in: [ids.import, ids.competition],
      },
    },
  });
  await prisma.team.deleteMany({
    where: { externalId: { in: [ids.alpha, ids.beta] } },
  });
  await prisma.competition.deleteMany({
    where: { externalId: ids.competition },
  });
}

afterEach(cleanup);

describe("historical signal service", () => {
  itWithDatabase(
    "guarda Elo prepartido del rival al ingerir un resultado finalizado",
    async () => {
      await cleanup();
      const competition = await prisma.competition.create({
        data: {
          externalId: ids.competition,
          name: "Elo Competition",
          kind: "club",
        },
      });
      const [alpha, beta] = await Promise.all([
        prisma.team.create({
          data: {
            externalId: ids.alpha,
            name: "Alpha Elo",
            kind: "club",
          },
        }),
        prisma.team.create({
          data: {
            externalId: ids.beta,
            name: "Beta Elo",
            kind: "club",
          },
        }),
      ]);
      const importRun = await prisma.historicalImport.create({
        data: {
          sourceRepo: "qa",
          sourceCommit: "runtime",
          sourcePath: ids.import,
          matchCount: 1,
        },
      });
      const priorMatch = await prisma.historicalMatch.create({
        data: {
          externalId: ids.priorMatch,
          sourceRepo: "qa",
          sourcePath: ids.import,
          sourceIndex: 0,
          season: "2025",
          kickoff: new Date("2025-01-01T00:00:00Z"),
          kickoffDate: "2025-01-01",
          homeGoals: 3,
          awayGoals: 0,
          rawJson: "{}",
          importId: importRun.id,
          competitionId: competition.id,
          homeTeamId: alpha.id,
          awayTeamId: beta.id,
        },
      });
      await prisma.historicalTeamMatch.createMany({
        data: [
          {
            historicalMatchId: priorMatch.id,
            teamId: alpha.id,
            opponentTeamId: beta.id,
            isHome: true,
            goalsFor: 3,
            goalsAgainst: 0,
            points: 3,
            kickoff: new Date("2025-01-01T00:00:00Z"),
          },
          {
            historicalMatchId: priorMatch.id,
            teamId: beta.id,
            opponentTeamId: alpha.id,
            isHome: false,
            goalsFor: 0,
            goalsAgainst: 3,
            points: 0,
            kickoff: new Date("2025-01-01T00:00:00Z"),
          },
        ],
      });

      const dataset = structuredClone(demoDataset);
      dataset.match = {
        ...dataset.match,
        id: ids.runtimeMatch,
        status: "finished",
        dataOrigin: "API",
        kickoff: "2025-03-01T00:00:00Z",
        date: "2025-03-01",
        scoreFullTime: [1, 1],
        competition: {
          ...dataset.match.competition,
          id: ids.competition,
          name: "Elo Competition",
          kind: "CLUB",
        },
        homeTeam: {
          ...dataset.match.homeTeam,
          id: ids.alpha,
          name: "Alpha Elo",
        },
        awayTeam: {
          ...dataset.match.awayTeam,
          id: ids.beta,
          name: "Beta Elo",
        },
      };

      await createHistoricalSignalService(prisma).ingestFinishedDataset(dataset);

      const rows = await prisma.historicalTeamMatch.findMany({
        where: {
          historicalMatch: { externalId: `provider:${ids.runtimeMatch}` },
        },
        orderBy: { isHome: "desc" },
      });

      expect(rows).toHaveLength(2);
      expect(rows[0].opponentElo).toBeLessThan(1500);
      expect(rows[1].opponentElo).toBeGreaterThan(1500);
    },
  );
});
