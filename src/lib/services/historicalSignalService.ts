import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  canonicalHistoricalTeamName,
  historicalFormFromMatches,
  type CalibrationSummary,
  type HistoricalMatchForForm,
} from "@/lib/historical/form";
import type { MatchDataset } from "@/types/domain";

type HistoricalDatabase = typeof prisma;

function parseCalibrationRun(
  run: Awaited<ReturnType<HistoricalDatabase["calibrationRun"]["findFirst"]>>,
): CalibrationSummary | undefined {
  if (!run) return undefined;
  return {
    sampleSize: run.sampleSize,
    brier: run.brier,
    logLoss: run.logLoss,
    rps: run.rps,
    empirical: {
      home: run.empiricalHome,
      draw: run.empiricalDraw,
      away: run.empiricalAway,
    },
    confidenceMultiplier: Math.min(
      1,
      Math.max(
        0.65,
        1 -
          Math.max(0, run.brier - 0.45) * 0.35 -
          Math.max(0, run.logLoss - 1.05) * 0.12,
      ),
    ),
  };
}

export function createHistoricalSignalService(
  database: HistoricalDatabase = prisma,
) {
  async function ingestFinishedDataset(dataset: MatchDataset) {
    const score = dataset.match.scoreFullTime;
    if (dataset.match.dataOrigin === "DEMO" || dataset.match.status !== "finished" || !score) {
      return;
    }
    const [homeGoals, awayGoals] = score;
    const competition = await database.competition.upsert({
      where: { externalId: dataset.match.competition.id },
      update: {
        name: dataset.match.competition.name,
        kind: dataset.match.competition.kind,
      },
      create: {
        externalId: dataset.match.competition.id,
        name: dataset.match.competition.name,
        kind: dataset.match.competition.kind,
      },
    });
    const [homeTeam, awayTeam] = await Promise.all([
      database.team.upsert({
        where: { externalId: dataset.match.homeTeam.id },
        update: {
          name: dataset.match.homeTeam.name,
          code: dataset.match.homeTeam.code,
          kind: dataset.match.competition.kind,
        },
        create: {
          externalId: dataset.match.homeTeam.id,
          name: dataset.match.homeTeam.name,
          code: dataset.match.homeTeam.code,
          kind: dataset.match.competition.kind,
        },
      }),
      database.team.upsert({
        where: { externalId: dataset.match.awayTeam.id },
        update: {
          name: dataset.match.awayTeam.name,
          code: dataset.match.awayTeam.code,
          kind: dataset.match.competition.kind,
        },
        create: {
          externalId: dataset.match.awayTeam.id,
          name: dataset.match.awayTeam.name,
          code: dataset.match.awayTeam.code,
          kind: dataset.match.competition.kind,
        },
      }),
    ]);
    const importRun = await database.historicalImport.upsert({
      where: {
        sourceRepo_sourceCommit_sourcePath: {
          sourceRepo: `provider:${dataset.match.dataOrigin.toLowerCase()}`,
          sourceCommit: "runtime",
          sourcePath: dataset.match.competition.id,
        },
      },
      update: {
        matchCount: { increment: 1 },
        rawMeta: JSON.stringify({ providerRuntime: true }),
      },
      create: {
        sourceRepo: `provider:${dataset.match.dataOrigin.toLowerCase()}`,
        sourceCommit: "runtime",
        sourcePath: dataset.match.competition.id,
        matchCount: 1,
        rawMeta: JSON.stringify({ providerRuntime: true }),
      },
    });
    const historicalMatch = await database.historicalMatch.upsert({
      where: { externalId: `provider:${dataset.match.id}` },
      update: {
        homeGoals,
        awayGoals,
        rawJson: JSON.stringify(dataset.match),
      },
      create: {
        externalId: `provider:${dataset.match.id}`,
        sourceRepo: importRun.sourceRepo,
        sourcePath: importRun.sourcePath,
        sourceIndex: 0,
        season: dataset.match.kickoff.slice(0, 4),
        round: dataset.match.competition.stage,
        kickoff: new Date(dataset.match.kickoff),
        kickoffDate: dataset.match.date,
        homeGoals,
        awayGoals,
        rawJson: JSON.stringify(dataset.match),
        importId: importRun.id,
        competitionId: competition.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      },
    });
    await database.historicalTeamMatch.createMany({
      data: [
        {
          historicalMatchId: historicalMatch.id,
          teamId: homeTeam.id,
          opponentTeamId: awayTeam.id,
          isHome: true,
          goalsFor: homeGoals,
          goalsAgainst: awayGoals,
          points:
            homeGoals > awayGoals ? 3 : homeGoals === awayGoals ? 1 : 0,
          kickoff: new Date(dataset.match.kickoff),
        },
        {
          historicalMatchId: historicalMatch.id,
          teamId: awayTeam.id,
          opponentTeamId: homeTeam.id,
          isHome: false,
          goalsFor: awayGoals,
          goalsAgainst: homeGoals,
          points:
            awayGoals > homeGoals ? 3 : awayGoals === homeGoals ? 1 : 0,
          kickoff: new Date(dataset.match.kickoff),
        },
      ],
      skipDuplicates: true,
    });
  }

  function openFootballExternalId(name: string) {
    return `openfootball:${canonicalHistoricalTeamName(name).replaceAll(" ", "-")}`;
  }

  async function findTeamByName(name: string) {
    const canonical = canonicalHistoricalTeamName(name);
    const candidates = await database.team.findMany({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { name: { equals: canonical, mode: "insensitive" } },
          { externalId: openFootballExternalId(name) },
        ],
      },
      select: { id: true, name: true, externalId: true },
    });
    if (!candidates.length) return undefined;
    const counts = await database.historicalTeamMatch.groupBy({
      by: ["teamId"],
      where: { teamId: { in: candidates.map((team) => team.id) } },
      _count: { teamId: true },
    });
    const countByTeam = new Map(
      counts.map((count) => [count.teamId, count._count.teamId]),
    );
    return [...candidates].sort((left, right) => {
      const rightCount = countByTeam.get(right.id) ?? 0;
      const leftCount = countByTeam.get(left.id) ?? 0;
      if (rightCount !== leftCount) return rightCount - leftCount;
      if (left.externalId.startsWith("openfootball:")) return -1;
      if (right.externalId.startsWith("openfootball:")) return 1;
      return 0;
    })[0];
  }

  async function teamHistory(teamName: string, before: string) {
    const team = await findTeamByName(teamName);
    if (!team) return { teamName, rows: [] };
    const rows = await database.historicalTeamMatch.findMany({
      where: {
        teamId: team.id,
        kickoff: { lt: new Date(before) },
      },
      orderBy: { kickoff: "desc" },
      take: 20,
      include: {
        historicalMatch: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
    });

    return {
      teamName: team.name,
      rows: rows.map<HistoricalMatchForForm>((row) => {
        const match = row.historicalMatch;
        return {
          kickoffDate: match.kickoffDate,
          homeTeamName: match.homeTeam.name,
          awayTeamName: match.awayTeam.name,
          homeGoals: row.isHome ? row.goalsFor : row.goalsAgainst,
          awayGoals: row.isHome ? row.goalsAgainst : row.goalsFor,
        };
      }),
    };
  }

  return {
    ingestFinishedDataset,
    async enrich(dataset: MatchDataset): Promise<MatchDataset> {
      if (dataset.match.dataOrigin === "DEMO") return dataset;
      const [homeHistory, awayHistory, calibrationRun] = await Promise.all([
        teamHistory(dataset.match.homeTeam.name, dataset.match.kickoff),
        teamHistory(dataset.match.awayTeam.name, dataset.match.kickoff),
        database.calibrationRun.findFirst({
          where: { modelName: "AMP ensemble" },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      const homeRows = homeHistory.rows;
      const awayRows = awayHistory.rows;
      const historical =
        homeRows.length || awayRows.length || calibrationRun
          ? {
              homeForm: homeRows.length
                ? historicalFormFromMatches(
                    homeHistory.teamName,
                    homeRows,
                    new Date(dataset.match.kickoff),
                  )
                : undefined,
              awayForm: awayRows.length
                ? historicalFormFromMatches(
                    awayHistory.teamName,
                    awayRows,
                    new Date(dataset.match.kickoff),
                  )
                : undefined,
              calibration: parseCalibrationRun(calibrationRun),
            }
          : undefined;

      if (!historical) return dataset;
      const homeHistoricalMatchCount = historical.homeForm?.matches ?? 0;
      const awayHistoricalMatchCount = historical.awayForm?.matches ?? 0;

      const enriched: MatchDataset = {
        ...dataset,
        historical,
        home: historical.homeForm
          ? {
              ...dataset.home,
              recentPointsPerGame:
                historical.homeForm.strengthAdjustedPointsPerGame,
              goalsFor: historical.homeForm.goalsFor,
              goalsAgainst: historical.homeForm.goalsAgainst,
              cleanSheetRate: historical.homeForm.cleanSheetRate,
            }
          : dataset.home,
        away: historical.awayForm
          ? {
              ...dataset.away,
              recentPointsPerGame:
                historical.awayForm.strengthAdjustedPointsPerGame,
              goalsFor: historical.awayForm.goalsFor,
              goalsAgainst: historical.awayForm.goalsAgainst,
              cleanSheetRate: historical.awayForm.cleanSheetRate,
            }
          : dataset.away,
        sources: [
          ...dataset.sources.filter((source) => source.id !== "historical-engine"),
          {
            id: "historical-engine",
            label: "Neon · histórico y calibración",
            type: "provider",
            status: "inferred",
            observedAt: new Date().toISOString(),
            detail: `Forma histórica: ${homeHistoricalMatchCount} partidos de ${dataset.match.homeTeam.name}, ${awayHistoricalMatchCount} de ${dataset.match.awayTeam.name}. Calibración: ${
              calibrationRun ? `${calibrationRun.sampleSize} predicciones` : "sin corrida guardada"
            }.`,
          },
        ],
      };

      return {
        ...enriched,
        context: {
          ...enriched.context,
          pressure: `${enriched.context.pressure} Histórico ponderado incorporado desde Neon cuando existe muestra previa.`,
        },
      };
    },
  };
}

export const historicalSignalService = createHistoricalSignalService();
