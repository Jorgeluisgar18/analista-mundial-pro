import { getApiUsageSnapshot } from "@/lib/services/apiUsageService";
import { getProviderStatus } from "@/lib/providers/providerConfig";
import { hasConfiguredFootballProvider } from "@/lib/providers/providerConfig";

export async function GET() {
  const providerStatus = getProviderStatus();
  const usage = await getApiUsageSnapshot().catch(() => []);
  const apiReady = hasConfiguredFootballProvider();

  return Response.json({
    mode: apiReady ? "api-ready" : "demo",
    checkedAt: new Date().toISOString(),
    providers: providerStatus.map((p) => ({
      id: p.id,
      label: p.label,
      configured: p.configured,
      purpose: p.purpose,
      usage: usage.find((u) =>
        p.id === "api-football"
          ? u.provider === "api-football"
          : p.id === "football-data"
            ? u.provider === "football-data"
            : p.id === "odds-api"
              ? u.provider === "the-odds-api"
              : false,
      ) ?? null,
    })),
    database: usage.length > 0 ? "connected" : "no-data",
  });
}
