import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  backtestRowsToCalibration,
  historicalMatchesToBacktestRows,
  outcomeFromScore,
  probabilitiesFromAnalysisResult,
} from "@/lib/backtesting/run";
import {
  calibrateDixonColesRho,
  type DixonColesCalibrationRow,
} from "@/lib/backtesting/dixon-coles-calibration";
import type { CalibrationRow } from "@/lib/historical/form";
import type { AnalysisResult } from "@/types/domain";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const disableDatabase = process.env.BACKTEST_DISABLE_DATABASE === "1";
const databaseUrl = disableDatabase ? undefined : process.env.DATABASE_URL?.trim();
const modelName = process.env.BACKTEST_MODEL_NAME ?? "AMP ensemble";
const modelVersion = process.env.BACKTEST_MODEL_VERSION ?? "1.1.0";
const minSampleSize = Number(process.env.BACKTEST_MIN_SAMPLE_SIZE ?? 30);
const sourceMode = process.env.BACKTEST_SOURCE ?? "auto";
const prisma = databaseUrl
  ? new PrismaClient({ adapter: new PrismaPg(databaseUrl) })
  : undefined;

function isAnalysisResult(value: unknown): value is AnalysisResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "mainProbabilities" in value &&
      (value as { mainProbabilities?: unknown }).mainProbabilities,
  );
}

async function main() {
  if (!prisma) {
    console.log(
      JSON.stringify({
        ok: true,
        calibrated: false,
        note: disableDatabase
          ? "BACKTEST_DISABLE_DATABASE=1 activo; no se ejecutó backtesting contra la base."
          : "DATABASE_URL no está configurada; no se ejecutó backtesting.",
      }),
    );
    return;
  }

  let rows: CalibrationRow[] = [];
  let dixonColesRows: DixonColesCalibrationRow[] = [];

  if (sourceMode !== "historical") {
    const analysisRuns = await prisma.analysisRun.findMany({
    include: {
      match: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2_000,
  });

    for (const run of analysisRuns) {
      const historical = await prisma.historicalMatch.findUnique({
        where: { externalId: `provider:${run.match.externalId}` },
        select: { homeGoals: true, awayGoals: true },
      });
      if (
        historical?.homeGoals === null ||
        historical?.homeGoals === undefined ||
        historical.awayGoals === null ||
        historical.awayGoals === undefined
      ) {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(run.result);
      } catch (e) {
        console.warn(`Error parsing analysis result for run ${run.id}:`, e);
        continue;
      }
      if (!isAnalysisResult(parsed)) continue;
      rows.push({
        probabilities: probabilitiesFromAnalysisResult(parsed),
        outcome: outcomeFromScore([historical.homeGoals, historical.awayGoals]),
      });
    }
  }

  let source = "analysisRun+historicalMatch";
  if (
    (rows.length < minSampleSize || dixonColesRows.length === 0) &&
    sourceMode !== "analysis"
  ) {
    const historicalMatches = await prisma.historicalMatch.findMany({
      where: {
        homeGoals: { not: null },
        awayGoals: { not: null },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: [{ kickoffDate: "asc" }, { sourceIndex: "asc" }],
    });

    const historicalBacktestRows = historicalMatchesToBacktestRows(
      historicalMatches
        .filter(
          (
            match,
          ): match is typeof match & { homeGoals: number; awayGoals: number } =>
            match.homeGoals !== null && match.awayGoals !== null,
        )
        .map((match) => ({
          id: match.id,
          kickoffDate: match.kickoffDate,
          homeTeamId: match.homeTeamId,
          homeTeamName: match.homeTeam.name,
          awayTeamId: match.awayTeamId,
          awayTeamName: match.awayTeam.name,
          homeGoals: match.homeGoals,
          awayGoals: match.awayGoals,
        })),
      {
        minPriorMatchesPerTeam: Number(
          process.env.BACKTEST_MIN_PRIOR_MATCHES ?? 2,
        ),
      },
    );
    if (rows.length < minSampleSize || sourceMode === "historical") {
      rows = historicalBacktestRows;
      source = "historicalMatch:rolling-offline";
    }
    dixonColesRows = historicalBacktestRows;
  }

  if (rows.length < minSampleSize) {
    console.log(
      JSON.stringify({
        ok: true,
        calibrated: false,
        sampleSize: rows.length,
          minSampleSize,
          source,
          note: "Muestra insuficiente para guardar CalibrationRun.",
      }),
    );
    return;
  }

  const summary = backtestRowsToCalibration(rows);
  const dixonColesCalibration = calibrateDixonColesRho(dixonColesRows, {
    minSampleSize: Math.max(30, Math.min(rows.length, minSampleSize)),
  });
  const saved = await prisma.calibrationRun.create({
    data: {
      modelName,
      modelVersion,
      sampleSize: summary.sampleSize,
      brier: summary.brier,
      logLoss: summary.logLoss,
      rps: summary.rps,
      empiricalHome: summary.empirical.home,
      empiricalDraw: summary.empirical.draw,
      empiricalAway: summary.empirical.away,
      config: JSON.stringify({
        source,
        minSampleSize,
        sourceMode,
        rhoSource: dixonColesRows.length ? "historicalMatch:rolling-offline" : null,
        dixonColesRho: dixonColesCalibration.rho,
        dixonColesRhoApplied: dixonColesCalibration.applied,
        rhoSampleSize: dixonColesCalibration.sampleSize,
        rhoAverageLogLoss: dixonColesCalibration.averageLogLoss,
      }),
    },
  });

  console.log(
    JSON.stringify({
      ok: true,
      calibrated: true,
      id: saved.id,
      sampleSize: summary.sampleSize,
      brier: summary.brier,
      logLoss: summary.logLoss,
      rps: summary.rps,
      empirical: summary.empirical,
      dixonColesRho: dixonColesCalibration.rho,
      dixonColesRhoApplied: dixonColesCalibration.applied,
      rhoSampleSize: dixonColesCalibration.sampleSize,
      source,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
