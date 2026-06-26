import { demoDataset, demoMatches } from "@/data/demo";
import { cacheDecision } from "@/lib/cache/cachePolicy";
import { apiQuotaDecision } from "@/lib/providers/apiQuotaPolicy";
import {
  createProviderRegistry,
  type ProviderEnvironment,
} from "@/lib/providers/providerRegistry";
import {
  getProviderStatus,
  missingFootballProviderWarning,
} from "@/lib/providers/providerConfig";
import type {
  FootballProvider,
  OddsProvider,
  WeatherProvider,
} from "@/lib/providers/types";
import type { MatchDataset } from "@/types/domain";
import type { MatchSnapshotCache } from "@/lib/cache/matchSnapshotCache";

let defaultSnapshotCache: MatchSnapshotCache | undefined;

async function getDefaultSnapshotCache() {
  if (!defaultSnapshotCache) {
    const { createMatchSnapshotCache } = await import(
      "@/lib/cache/matchSnapshotCache"
    );
    defaultSnapshotCache = createMatchSnapshotCache();
  }
  return defaultSnapshotCache;
}

export function createMatchService({
  env,
  providers: injectedProviders,
  now = () => new Date(),
  snapshotCache,
}: {
  env?: ProviderEnvironment;
  providers?: {
    football: FootballProvider[];
    odds?: OddsProvider;
    weather?: WeatherProvider;
  };
  now?: () => Date;
  snapshotCache?: Pick<MatchSnapshotCache, "getFreshDataset">;
} = {}) {
  const providers = injectedProviders ?? createProviderRegistry(env);
  const providerStatus = () => getProviderStatus(env);

  async function providerQuotaWarning(providerId: string) {
    if (providerId !== "api-football") return undefined;
    const { getApiUsageSnapshot } = await import(
      "@/lib/services/apiUsageService"
    );
    const usage = (await getApiUsageSnapshot()).find(
      (record) => record.provider === "API-Football" && record.period === "day",
    );
    const decision = apiQuotaDecision(usage);
    return decision.shouldCall
      ? undefined
      : `API-Football omitido para proteger el plan gratuito. ${decision.reason}`;
  }

  return {
    async listByDate(date: string, competition?: string) {
      const warnings: string[] = [];
      for (const provider of providers.football) {
        const quotaWarning = await providerQuotaWarning(provider.id);
        if (quotaWarning) {
          warnings.push(quotaWarning);
          continue;
        }
        try {
          const result = await provider.listMatches(date, competition);
          if (result.data.length) {
            return {
              mode: "api" as const,
              source: result.meta.source,
              fetchedAt: result.meta.fetchedAt,
              warnings: result.meta.warnings,
              providerStatus: providerStatus(),
              matches: result.data,
            };
          }
          warnings.push(`${result.meta.source}: sin partidos.`);
        } catch (error) {
          warnings.push(
            error instanceof Error ? error.message : "Error de proveedor",
          );
        }
      }

      const matches = demoMatches.filter(
        (match) =>
          match.date === date &&
          (!competition ||
            competition === "all" ||
            match.competition.id === competition),
      );
      const missingProviderWarning = missingFootballProviderWarning(env);
      return {
        mode: "demo" as const,
        source: "Datos demostrativos locales",
        fetchedAt: new Date().toISOString(),
        warnings: [
          ...warnings,
          ...(missingProviderWarning ? [missingProviderWarning] : []),
          "Sin claves activas o cobertura disponible: se muestran datos demostrativos.",
        ],
        providerStatus: providerStatus(),
        matches,
      };
    },

    async getById(id: string): Promise<MatchDataset | null> {
      if (id === demoDataset.match.id) return structuredClone(demoDataset);
      const cache =
        snapshotCache ?? (injectedProviders ? undefined : await getDefaultSnapshotCache());
      const cached = await cache?.getFreshDataset(id);
      if (cached) return structuredClone(cached);

      for (const provider of providers.football) {
        const quotaWarning = await providerQuotaWarning(provider.id);
        if (quotaWarning) continue;
        try {
          const result = await provider.getMatch(id);
          if (result.data) {
            const weatherSource = result.data.sources.find(
              (source) => source.id === "weather-provider",
            );
            const weatherDecision = cacheDecision({
              resource: "weather",
              kickoff: result.data.match.kickoff,
              observedAt: weatherSource?.observedAt,
              now: now(),
            });
            if (
              providers.weather &&
              result.data.match.city !== "Dato no disponible" &&
              weatherDecision.shouldRefresh
            ) {
              try {
                const weather = await providers.weather.getWeatherForLocation(
                  result.data.match.city,
                  result.data.match.country,
                  result.data.match.kickoff,
                );
                result.data.weather = weather.data;
                result.data.sources.push({
                  id: "weather-provider",
                  label: weather.meta.source,
                  type: "provider",
                  status: weather.data.status,
                  observedAt: weather.meta.fetchedAt,
                  detail: weather.data.value,
                });
              } catch {
                result.data.sources.push({
                  id: "weather-provider-error",
                  label: "Open-Meteo",
                  type: "provider",
                  status: "unavailable",
                  observedAt: new Date().toISOString(),
                  detail: "No fue posible consultar el clima en este momento.",
                });
              }
            } else if (providers.weather && weatherSource) {
              result.data.sources.push({
                id: "weather-cache-hit",
                label: weatherSource.label,
                type: "provider",
                status: weatherSource.status,
                observedAt: weatherSource.observedAt,
                detail: `Clima reutilizado por caché: ${weatherDecision.reason}`,
              });
            }

            const oddsSource = result.data.sources.find(
              (source) => source.id === "odds-provider",
            );
            const latestOddObservedAt = result.data.odds
              .map((odd) => odd.observedAt)
              .sort()
              .at(-1);
            const oddsDecision = cacheDecision({
              resource: "odds",
              kickoff: result.data.match.kickoff,
              observedAt: oddsSource?.observedAt ?? latestOddObservedAt,
              now: now(),
            });
            if (providers.odds && oddsDecision.shouldRefresh) {
              try {
                const odds = await providers.odds.getOdds(result.data.match);
                result.data.odds = odds.data;
                result.data.sources.push({
                  id: "odds-provider",
                  label: odds.meta.source,
                  type: "provider",
                  status: odds.data.length ? "confirmed" : "unavailable",
                  observedAt: odds.meta.fetchedAt,
                  detail: odds.data.length
                    ? "Snapshot de cuotas bajo demanda."
                    : "Cuotas no disponibles para el partido.",
                });
              } catch {
                result.data.sources.push({
                  id: "odds-provider-error",
                  label: "Proveedor de cuotas",
                  type: "provider",
                  status: "unavailable",
                  observedAt: new Date().toISOString(),
                  detail: "No fue posible consultar cuotas en este momento.",
                });
              }
            } else if (providers.odds && oddsSource) {
              result.data.sources.push({
                id: "odds-cache-hit",
                label: oddsSource.label,
                type: "provider",
                status: oddsSource.status,
                observedAt: oddsSource.observedAt,
                detail: `Cuotas reutilizadas por caché: ${oddsDecision.reason}`,
              });
            }
            return result.data;
          }
        } catch {
          // El siguiente proveedor puede aportar el dato.
        }
      }
      return null;
    },
  };
}

export const matchService = createMatchService();
