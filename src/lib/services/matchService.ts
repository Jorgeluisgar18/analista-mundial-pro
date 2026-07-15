import { demoMatches, getDemoDatasetById } from "@/data/demo";
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
  MatchEnrichmentProvider,
  OddsProvider,
  ProviderResult,
  WeatherProvider,
} from "@/lib/providers/types";
import type { MatchDataset } from "@/types/domain";
import type { MatchSnapshotCache } from "@/lib/cache/matchSnapshotCache";

let defaultSnapshotCache: MatchSnapshotCache | undefined;

export class MatchProviderUnavailableError extends Error {
  readonly status = 503;

  constructor(
    readonly providerId: string,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MatchProviderUnavailableError";
  }
}

export function isMatchProviderUnavailableError(
  error: unknown,
): error is MatchProviderUnavailableError {
  return error instanceof MatchProviderUnavailableError;
}

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
    enrichment?: MatchEnrichmentProvider[];
  };
  now?: () => Date;
  snapshotCache?: Pick<MatchSnapshotCache, "getFreshDataset">;
} = {}) {
  const providers = injectedProviders ?? createProviderRegistry(env);
  const inFlightDatasetLookups = new Map<string, Promise<MatchDataset | null>>();
  const providerStatus = () => getProviderStatus(env);
  const scopedId = (providerId: string, id: string) =>
    id.includes("--") || id.includes(":") ? id : `${providerId}--${id}`;
  const splitScopedId = (id: string) => {
    const separator = id.includes("--") ? id.indexOf("--") : id.indexOf(":");
    const separatorLength = id.includes("--") ? 2 : 1;
    if (separator <= 0) return { providerId: undefined, rawId: id };
    return {
      providerId: id.slice(0, separator),
      rawId: id.slice(separator + separatorLength),
    };
  };
  const scopeDataset = (dataset: MatchDataset, providerId: string, requestedId?: string) => {
    const next = structuredClone(dataset);
    next.match.id = requestedId ?? scopedId(providerId, next.match.id);
    return next;
  };
  const enrichListedMatchesFromCache = async (
    matches: MatchDataset["match"][],
    providerId: string,
  ) => {
    const cache =
      snapshotCache ?? (injectedProviders ? undefined : await getDefaultSnapshotCache());
    if (!cache) {
      return {
        matches: matches.map((match) => ({
          ...match,
          id: scopedId(providerId, match.id),
        })),
        warnings: [] as string[],
      };
    }

    let hits = 0;
    const enriched = await Promise.all(
      matches.map(async (match) => {
        const id = scopedId(providerId, match.id);
        try {
          const cached = await cache.getFreshDataset(id);
          if (cached) {
            hits += 1;
            return {
              ...cached.match,
              id,
            };
          }
        } catch {
          // La lista no debe fallar si el cache persistente no esta disponible.
        }
        return {
          ...match,
          id,
        };
      }),
    );

    return {
      matches: enriched,
      warnings: hits
        ? [`${hits} partido(s) enriquecidos desde cache persistente.`]
        : [],
    };
  };

  async function providerQuotaWarning(providerId: string) {
    const { getApiUsageSnapshot } = await import(
      "@/lib/services/apiUsageService"
    );
    const usage = await getApiUsageSnapshot();
    const target =
      providerId === "api-football"
        ? { provider: "API-Football", period: "day" as const, reserve: 10 }
        : providerId === "footballdata-io"
          ? { provider: "Footballdata.io", period: "month" as const, reserve: 100 }
        : providerId === "the-odds-api"
          ? { provider: "The Odds API", period: "month" as const, reserve: 25 }
          : undefined;
    if (!target) return undefined;

    const record = usage.find(
      (item) =>
        item.provider === target.provider && item.period === target.period,
    );
    const decision = apiQuotaDecision(record, { reserve: target.reserve });
    return decision.shouldCall
      ? undefined
      : `${target.provider} omitido para proteger el plan gratuito. ${decision.reason}`;
  }

  const service = {
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
            const enriched = await enrichListedMatchesFromCache(
              result.data,
              provider.id,
            );
            return {
              mode: "api" as const,
              source: result.meta.source,
              fetchedAt: result.meta.fetchedAt,
              warnings: [...result.meta.warnings, ...enriched.warnings],
              providerStatus: providerStatus(),
              matches: enriched.matches,
            };
          }
          warnings.push(...result.meta.warnings);
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
        source: "Muestra local de respaldo",
        fetchedAt: new Date().toISOString(),
        warnings: [
          ...warnings,
          ...(missingProviderWarning ? [missingProviderWarning] : []),
          "Sin cobertura real disponible: se muestra una muestra local claramente identificada.",
        ],
        providerStatus: providerStatus(),
        matches,
      };
    },

    async getById(id: string, bypassCache?: boolean): Promise<MatchDataset | null> {
      const demoDataset = getDemoDatasetById(id);
      if (demoDataset) return demoDataset;
      const requested = splitScopedId(id);
      const providerErrors: MatchProviderUnavailableError[] = [];
      if (!bypassCache) {
        const cache =
          snapshotCache ?? (injectedProviders ? undefined : await getDefaultSnapshotCache());
        const cached = await cache?.getFreshDataset(id);
        if (cached) return structuredClone(cached);
        const inFlight = inFlightDatasetLookups.get(id);
        if (inFlight) {
          const shared = await inFlight;
          return shared ? structuredClone(shared) : null;
        }
        const lookup = service.getById(id, true);
        inFlightDatasetLookups.set(id, lookup);
        try {
          const loaded = await lookup;
          return loaded ? structuredClone(loaded) : null;
        } finally {
          inFlightDatasetLookups.delete(id);
        }
      }

      for (const provider of providers.football) {
        if (requested.providerId && provider.id !== requested.providerId) {
          continue;
        }
        const quotaWarning = await providerQuotaWarning(provider.id);
        if (quotaWarning) continue;
        try {
          const result = await provider.getMatch(requested.rawId);
          if (result.data) {
            result.data = scopeDataset(result.data, provider.id, requested.providerId ? id : undefined);
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
            const oddsQuotaWarning = providers.odds
              ? await providerQuotaWarning(providers.odds.id)
              : undefined;
            if (providers.odds && oddsDecision.shouldRefresh && !oddsQuotaWarning) {
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
                    : (odds.meta.warnings[0] ??
                      "Cuotas no disponibles para el partido."),
                });
              } catch (error) {
                result.data.sources.push({
                  id: "odds-provider-error",
                  label: "Proveedor de cuotas",
                  type: "provider",
                  status: "unavailable",
                  observedAt: new Date().toISOString(),
                  detail:
                    error instanceof Error
                      ? error.message
                      : "No fue posible consultar cuotas en este momento.",
                });
              }
            } else if (providers.odds && oddsQuotaWarning) {
              result.data.sources.push({
                id: "odds-quota-guard",
                label: "The Odds API",
                type: "provider",
                status: "unavailable",
                observedAt: new Date().toISOString(),
                detail: oddsQuotaWarning,
              });
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
            for (const enrichmentProvider of providers.enrichment ?? []) {
              try {
                const enriched: ProviderResult<MatchDataset> =
                  await enrichmentProvider.enrich(result.data);
                result.data = enriched.data;
              } catch {
                result.data.sources.push({
                  id: `${enrichmentProvider.id}-error`,
                  label: "Proveedor de enriquecimiento",
                  type: "provider",
                  status: "unavailable",
                  observedAt: new Date().toISOString(),
                  detail:
                    "No fue posible enriquecer contexto visual/secundario en este momento.",
                });
              }
            }
            return result.data;
          }
        } catch (error) {
          providerErrors.push(
            new MatchProviderUnavailableError(
              provider.id,
              error instanceof Error
                ? error.message
                : "Proveedor temporalmente no disponible.",
              error,
            ),
          );
        }
      }
      if (providerErrors.length) {
        throw providerErrors[0];
      }
      return null;
    },
  };
  return service;
}

export const matchService = createMatchService();
