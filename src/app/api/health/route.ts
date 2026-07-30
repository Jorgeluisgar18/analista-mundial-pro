import { getApiUsageSnapshot } from "@/lib/services/apiUsageService";
import { getProviderTelemetrySnapshot } from "@/lib/services/providerTelemetryService";
import { getProviderStatus } from "@/lib/providers/providerConfig";
import { hasConfiguredFootballProvider } from "@/lib/providers/providerConfig";
import { getDatabaseRuntimeStatus, prisma } from "@/lib/db/prisma";
import { getModelHealthSnapshot } from "@/lib/services/modelHealthService";
import { createRuntimePolicy } from "@/lib/runtime/productionPolicy";

const usageProviderByStatusId = {
  "api-football": "API-Football",
  "football-data": "Football-Data.org",
  "footballdata-io": "Footballdata.io",
  "the-sportsdb": "TheSportsDB",
  "odds-api": "The Odds API",
  "open-meteo": "Open-Meteo",
} as const;

function unavailableModelHealth() {
  return {
    status: "unavailable" as const,
    checkedAt: new Date().toISOString(),
    elo: {
      status: "unavailable" as const,
      totalRows: 0,
      rowsWithOpponentElo: 0,
      coverage: 0,
    },
    backtesting: {
      status: "unavailable" as const,
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
    error: "Estado de salud del modelo no disponible.",
  };
}

export async function GET() {
  const runtimePolicy = createRuntimePolicy();
  const providerStatus = getProviderStatus();
  const databaseRuntime = getDatabaseRuntimeStatus();
  const databaseProbe =
    databaseRuntime.status === "configured"
      ? await prisma.apiUsage
          .count()
          .then((records: number) => ({
            status: "connected" as const,
            records,
          }))
          .catch((error: unknown) => ({
            status: "unavailable" as const,
            records: 0,
            error:
              error instanceof Error
                ? error.message
                : "Database health probe failed",
          }))
      : {
          status: "unavailable" as const,
          records: 0,
          error: "Base de datos no disponible.",
        };
  const usage =
    databaseProbe.status === "connected"
      ? await getApiUsageSnapshot().catch(() => [])
      : [];
  const telemetryProbe =
    databaseProbe.status === "connected"
      ? await getProviderTelemetrySnapshot()
          .then((records) => ({
            status: "connected" as const,
            records,
          }))
          .catch(() => ({
            status: "unavailable" as const,
            records: [],
          }))
      : {
          status: "unavailable" as const,
          records: [],
        };
  const telemetry = telemetryProbe.records;
  const modelHealth =
    databaseProbe.status === "connected"
      ? await getModelHealthSnapshot()
          .then((snapshot) =>
            snapshot.error
              ? { ...snapshot, error: "Estado de salud del modelo no disponible." }
              : snapshot,
          )
          .catch(unavailableModelHealth)
      : unavailableModelHealth();
  const apiReady = hasConfiguredFootballProvider();
  const isOperational = apiReady && databaseProbe.status === "connected";
  const mode = isOperational
    ? "operational"
    : runtimePolicy.isProduction
      ? "degraded"
      : "development-demo";

  return Response.json({
    mode,
    checkedAt: new Date().toISOString(),
    providers: providerStatus.map((p) => ({
      id: p.id,
      label: p.label,
      configured: p.configured,
      purpose: p.purpose,
      usage:
        usage.find(
          (u) => u.provider === usageProviderByStatusId[p.id],
        ) ?? null,
      telemetry:
        telemetry.find(
          (item) => item.provider === usageProviderByStatusId[p.id],
        ) ?? null,
    })),
    telemetry,
    telemetryStatus: telemetryProbe.status,
    modelHealth,
    database: databaseProbe.status,
    databaseRecords:
      databaseProbe.status === "connected" ? databaseProbe.records : 0,
    databaseError:
      databaseProbe.status === "unavailable"
        ? "Base de datos no disponible."
        : null,
  }, { status: mode === "degraded" ? 503 : 200 });
}
