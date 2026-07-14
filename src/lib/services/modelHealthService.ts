import { prisma } from "@/lib/db/prisma";
import type { AnalysisModelConfigInput } from "@/types/domain";

type ModelHealthDatabase = Pick<typeof prisma, "calibrationRun" | "historicalTeamMatch">;

export type ModelHealthStatus =
  | "ready"
  | "partial"
  | "stale"
  | "missing"
  | "unavailable";

export interface ModelHealthSnapshot {
  status: "connected" | "unavailable";
  checkedAt: string;
  elo: {
    status: ModelHealthStatus;
    totalRows: number;
    rowsWithOpponentElo: number;
    coverage: number;
  };
  backtesting: {
    status: ModelHealthStatus;
    latestRunAt: string | null;
    daysSinceLastRun: number | null;
    sampleSize: number;
    brier: number | null;
    logLoss: number | null;
    rps: number | null;
    dixonColesRho: number | null;
    rhoSampleSize: number | null;
    source: string | null;
    modelConfig: AnalysisModelConfigInput | null;
  };
  error?: string;
}

function parseCalibrationConfig(config: string) {
  try {
    const parsed = JSON.parse(config) as {
      dixonColesRho?: unknown;
      rhoSampleSize?: unknown;
      source?: unknown;
      modelConfig?: unknown;
    };
    return {
      dixonColesRho:
        typeof parsed.dixonColesRho === "number" &&
        Number.isFinite(parsed.dixonColesRho)
          ? parsed.dixonColesRho
          : null,
      rhoSampleSize:
        typeof parsed.rhoSampleSize === "number" &&
        Number.isFinite(parsed.rhoSampleSize)
          ? parsed.rhoSampleSize
          : null,
      source: typeof parsed.source === "string" ? parsed.source : null,
      modelConfig: parseModelConfig(parsed.modelConfig),
    };
  } catch {
    return {
      dixonColesRho: null,
      rhoSampleSize: null,
      source: null,
      modelConfig: null,
    };
  }
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function parseModelConfig(value: unknown): AnalysisModelConfigInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as {
    label?: unknown;
    weights?: unknown;
  };
  const weights =
    input.weights && typeof input.weights === "object"
      ? (input.weights as Record<string, unknown>)
      : undefined;
  const parsed: AnalysisModelConfigInput = {};
  if (typeof input.label === "string" && input.label.trim()) {
    parsed.label = input.label;
  }
  if (weights) {
    parsed.weights = {
      dixonColes: finiteNumber(weights.dixonColes)
        ? Number(weights.dixonColes)
        : undefined,
      simulation: finiteNumber(weights.simulation)
        ? Number(weights.simulation)
        : undefined,
      logistic: finiteNumber(weights.logistic)
        ? Number(weights.logistic)
        : undefined,
    };
  }
  return parsed.label || parsed.weights ? parsed : null;
}

function daysSince(date: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

function eloStatus(totalRows: number, coverage: number): ModelHealthStatus {
  if (totalRows === 0) return "missing";
  if (coverage >= 80) return "ready";
  if (coverage > 0) return "partial";
  return "missing";
}

function backtestingStatus(
  latestRunAt: Date | null,
  sampleSize: number,
  now: Date,
): ModelHealthStatus {
  if (!latestRunAt) return "missing";
  if (sampleSize < 30) return "partial";
  return daysSince(latestRunAt, now) <= 30 ? "ready" : "stale";
}

export async function getModelHealthSnapshot(
  database: ModelHealthDatabase = prisma,
  now = new Date(),
): Promise<ModelHealthSnapshot> {
  try {
    const [totalRows, rowsWithOpponentElo, latestCalibration] =
      await Promise.all([
        database.historicalTeamMatch.count(),
        database.historicalTeamMatch.count({
          where: { opponentElo: { not: null } },
        }),
        database.calibrationRun.findFirst({
          where: { modelName: "AMP ensemble" },
          orderBy: { createdAt: "desc" },
        }),
      ]);
    const coverage =
      totalRows > 0 ? Math.round((rowsWithOpponentElo / totalRows) * 100) : 0;
    const config = latestCalibration
      ? parseCalibrationConfig(latestCalibration.config)
      : {
          dixonColesRho: null,
          rhoSampleSize: null,
          source: null,
          modelConfig: null,
        };
    const latestRunAt = latestCalibration?.createdAt ?? null;

    return {
      status: "connected",
      checkedAt: now.toISOString(),
      elo: {
        status: eloStatus(totalRows, coverage),
        totalRows,
        rowsWithOpponentElo,
        coverage,
      },
      backtesting: {
        status: backtestingStatus(
          latestRunAt,
          latestCalibration?.sampleSize ?? 0,
          now,
        ),
        latestRunAt: latestRunAt?.toISOString() ?? null,
        daysSinceLastRun: latestRunAt ? daysSince(latestRunAt, now) : null,
        sampleSize: latestCalibration?.sampleSize ?? 0,
        brier: latestCalibration?.brier ?? null,
        logLoss: latestCalibration?.logLoss ?? null,
        rps: latestCalibration?.rps ?? null,
        dixonColesRho: config.dixonColesRho,
        rhoSampleSize: config.rhoSampleSize,
        source: config.source,
        modelConfig: config.modelConfig,
      },
    };
  } catch (error) {
    return {
      status: "unavailable",
      checkedAt: now.toISOString(),
      elo: {
        status: "unavailable",
        totalRows: 0,
        rowsWithOpponentElo: 0,
        coverage: 0,
      },
      backtesting: {
        status: "unavailable",
        latestRunAt: null,
        daysSinceLastRun: null,
        sampleSize: 0,
        brier: null,
        logLoss: null,
        rps: null,
        dixonColesRho: null,
        rhoSampleSize: null,
        source: null,
        modelConfig: null,
      },
      error:
        error instanceof Error
          ? error.message
          : "Model health probe failed",
    };
  }
}
