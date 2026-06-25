import "server-only";
import { createHash } from "node:crypto";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { prisma } from "@/lib/db/prisma";
import { applyManualOverrides } from "@/lib/overrides/applyManualOverrides";
import { matchService } from "@/lib/services/matchService";
import type { AnalysisResult, MatchDataset } from "@/types/domain";

function hashDataset(dataset: MatchDataset) {
  return createHash("sha256")
    .update(JSON.stringify(dataset))
    .digest("hex");
}

async function persistAnalysis(
  dataset: MatchDataset,
  result: AnalysisResult,
): Promise<void> {
  const dbMatch = await prisma.match.findUnique({
    where: { externalId: dataset.match.id },
  });
  if (!dbMatch) return;
  const inputHash = hashDataset(dataset);
  const snapshot = await prisma.matchSnapshot.upsert({
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
  const modelVersion = await prisma.modelVersion.upsert({
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
  const existing = await prisma.analysisRun.findFirst({
    where: {
      inputHash,
      manuallyUpdated: result.manuallyUpdated,
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return;
  await prisma.analysisRun.create({
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
          evidenceStatus: prediction.evidenceStatus,
        })),
      },
    },
  });
}

export async function getAnalysis(
  matchId: string,
  options: { manuallyUpdated?: boolean; persist?: boolean } = {},
) {
  const dataset = await matchService.getById(matchId);
  if (!dataset) return null;
  const dbMatch = await prisma.match.findUnique({
    where: { externalId: matchId },
  });
  const storedOverrides = dbMatch
    ? await prisma.manualOverride.findMany({
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
      await persistAnalysis(adjustedDataset, result);
    } catch (error) {
      console.warn("No se pudo persistir el análisis:", error);
    }
  }
  return { dataset: adjustedDataset, analysis: result };
}
