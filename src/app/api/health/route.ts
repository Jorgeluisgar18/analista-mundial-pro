import { getApiUsageSnapshot } from "@/lib/services/apiUsageService";
import { getProviderStatus } from "@/lib/providers/providerConfig";
import { hasConfiguredFootballProvider } from "@/lib/providers/providerConfig";
import { prisma } from "@/lib/db/prisma";

const usageProviderByStatusId = {
  "api-football": "API-Football",
  "football-data": "Football-Data.org",
  "odds-api": "The Odds API",
  "open-meteo": "Open-Meteo",
} as const;

export async function GET() {
  const providerStatus = getProviderStatus();
  const databaseProbe = await prisma.apiUsage
    .count()
    .then((records) => ({
      status: "connected" as const,
      records,
    }))
    .catch((error: unknown) => ({
      status: "unavailable" as const,
      error:
        error instanceof Error
          ? error.message
          : "Database health probe failed",
    }));
  const usage =
    databaseProbe.status === "connected"
      ? await getApiUsageSnapshot().catch(() => [])
      : [];
  const apiReady = hasConfiguredFootballProvider();

  return Response.json({
    mode: apiReady ? "api-ready" : "demo",
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
    })),
    database: databaseProbe.status,
    databaseRecords:
      databaseProbe.status === "connected" ? databaseProbe.records : 0,
    databaseError:
      databaseProbe.status === "unavailable" ? databaseProbe.error : null,
  });
}
