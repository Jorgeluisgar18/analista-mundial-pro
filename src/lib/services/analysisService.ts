import "server-only";
import { createHash } from "node:crypto";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { prisma } from "@/lib/db/prisma";
import { applyManualOverrides } from "@/lib/overrides/applyManualOverrides";
import { matchService as defaultMatchService } from "@/lib/services/matchService";
import type { AnalysisResult, MatchDataset } from "@/types/domain";

function hashDataset(dataset: MatchDataset) {
  return createHash("sha256")
    .update(JSON.stringify(dataset))
    .digest("hex");
}

async function persistAnalysis(
  database: typeof prisma,
  dataset: MatchDataset,
  result: AnalysisResult,
): Promise<void> {
  const dbMatch = await database.$transaction(async (transaction) => {
    const competition = await transaction.competition.upsert({
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
    const homeTeam = await transaction.team.upsert({
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
    });
    const awayTeam = await transaction.team.upsert({
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
    });
    return transaction.match.upsert({
      where: { externalId: dataset.match.id },
      update: {
        kickoff: new Date(dataset.match.kickoff),
        status: dataset.match.status,
        stage: dataset.match.competition.stage,
        venue: dataset.match.venue,
        city: dataset.match.city,
        country: dataset.match.country,
        timezone: dataset.match.timezone,
        dataOrigin: dataset.match.dataOrigin,
        competitionId: competition.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      },
      create: {
        externalId: dataset.match.id,
        kickoff: new Date(dataset.match.kickoff),
        status: dataset.match.status,
        stage: dataset.match.competition.stage,
        venue: dataset.match.venue,
        city: dataset.match.city,
        country: dataset.match.country,
        timezone: dataset.match.timezone,
        dataOrigin: dataset.match.dataOrigin,
        competitionId: competition.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      },
    });
  });
  const inputHash = hashDataset(dataset);
  const snapshot = await database.matchSnapshot.upsert({
    where: {
      matchId_hash: {
        matchId: dbMatch.id,
        hash: inputHash,
      },
    },
    update: {
      fetchedAt: new Date(dataset.match.fetchedAt),
      payload: JSON.stringify(dataset),
    },
    create: {
      matchId: dbMatch.id,
      hash: inputHash,
      payload: JSON.stringify(dataset),
      fetchedAt: new Date(dataset.match.fetchedAt),
      source: dataset.match.dataOrigin,
    },
  });
  await database.evidenceRecord.deleteMany({
    where: { snapshotId: snapshot.id },
  });
  if (dataset.sources.length) {
    await database.evidenceRecord.createMany({
      data: dataset.sources.map((source) => ({
        snapshotId: snapshot.id,
        field: source.id,
        value: source.detail,
        status: source.status,
        sourceType: source.type,
        source: source.label,
        url: source.url,
        observedAt: new Date(source.observedAt),
      })),
    });
  }
  await Promise.all(
    dataset.odds.map((odd) =>
      database.oddsSnapshot.upsert({
        where: {
          matchId_bookmaker_market_outcome_observedAt: {
            matchId: dbMatch.id,
            bookmaker: odd.bookmaker,
            market: odd.market,
            outcome: odd.outcome,
            observedAt: new Date(odd.observedAt),
          },
        },
        update: { odd: odd.odd },
        create: {
          matchId: dbMatch.id,
          bookmaker: odd.bookmaker,
          market: odd.market,
          outcome: odd.outcome,
          odd: odd.odd,
          observedAt: new Date(odd.observedAt),
        },
      }),
    ),
  );
  const modelVersion = await database.modelVersion.upsert({
    where: {
      name_version: {
        name: "AMP ensemble",
        version: "1.0.0",
      },
    },
    update: {},
    create: {
      name: "AMP ensemble",
      version: "1.0.0",
      config: JSON.stringify({ method: "Dixon-Coles + contextual features" }),
    },
  });
  const existing = await database.analysisRun.findFirst({
    where: {
      inputHash,
      manuallyUpdated: result.manuallyUpdated,
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return;
  await database.analysisRun.create({
    data: {
      matchId: dbMatch.id,
      snapshotId: snapshot.id,
      modelVersionId: modelVersion.id,
      inputHash,
      result: JSON.stringify(result),
      manuallyUpdated: result.manuallyUpdated,
      predictions: {
        create: result.predictions.map((prediction) => ({
          category: prediction.category,
          market: prediction.market,
          line: prediction.line,
          probability: prediction.probability,
          confidence: prediction.confidence,
          riskLevel: prediction.riskLevel,
          reason: prediction.reason,
          risk: prediction.risk,
          minimumOdd: prediction.minimumOddForValue,
          availableOdd: prediction.availableOdd,
          expectedValue: prediction.expectedValue,
          marketProbability: prediction.marketProbability,
          modelEdge: prediction.modelEdge,
          evidenceStatus: prediction.evidenceStatus,
        })),
      },
    },
  });
}

interface AnalysisMatchService {
  getById(id: string, bypassCache?: boolean): Promise<MatchDataset | null>;
}

export function createAnalysisService({
  matchService = defaultMatchService,
  database = prisma,
}: {
  matchService?: AnalysisMatchService;
  database?: typeof prisma;
} = {}) {
  return {
    async getAnalysis(
      matchId: string,
      options: { manuallyUpdated?: boolean; persist?: boolean; bypassCache?: boolean } = {},
    ) {
      const dataset = await matchService.getById(matchId, options.bypassCache);
      if (!dataset) return null;
      const dbMatch = await database.match.findUnique({
        where: { externalId: matchId },
      });
      const storedOverrides = dbMatch
        ? await database.manualOverride.findMany({
            where: { matchId: dbMatch.id },
            orderBy: { observedAt: "asc" },
          })
        : [];
      const adjustedDataset = applyManualOverrides(
        dataset,
        storedOverrides.map((override) => ({
          type: override.type as
            | "absence"
            | "starter"
            | "formation"
            | "referee"
            | "weather"
            | "odds"
            | "suspension",
          id: override.id,
          description: override.description,
          sourceUrl: override.sourceUrl ?? undefined,
          observedAt: override.observedAt.toISOString(),
          teamId: override.teamId ?? undefined,
          player: override.player ?? undefined,
          impact: override.impact as "low" | "medium" | "high" | undefined,
          area: override.area as "attack" | "defense" | "balanced" | undefined,
          value: override.value ?? undefined,
        })),
      );
      const manuallyUpdated =
        Boolean(options.manuallyUpdated) || storedOverrides.length > 0;
      const result = analyzeMatch(adjustedDataset, { manuallyUpdated });
      if (options.persist !== false) {
        try {
          await persistAnalysis(database, adjustedDataset, result);
        } catch (error) {
          console.warn("No se pudo persistir el análisis:", error);
        }
      }
      return { dataset: adjustedDataset, analysis: result };
    },
  };
}

export const { getAnalysis } = createAnalysisService();
