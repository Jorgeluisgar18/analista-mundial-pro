import { demoDataset, demoMatches } from "@/data/demo";
import {
  createProviderRegistry,
  type ProviderEnvironment,
} from "@/lib/providers/providerRegistry";
import type {
  FootballProvider,
  OddsProvider,
  WeatherProvider,
} from "@/lib/providers/types";
import type { MatchDataset } from "@/types/domain";

export function createMatchService({
  env,
  providers: injectedProviders,
}: {
  env?: ProviderEnvironment;
  providers?: {
    football: FootballProvider[];
    odds?: OddsProvider;
    weather?: WeatherProvider;
  };
} = {}) {
  const providers = injectedProviders ?? createProviderRegistry(env);

  return {
    async listByDate(date: string, competition?: string) {
      const warnings: string[] = [];
      for (const provider of providers.football) {
        try {
          const result = await provider.listMatches(date, competition);
          if (result.data.length) {
            return {
              mode: "api" as const,
              source: result.meta.source,
              fetchedAt: result.meta.fetchedAt,
              warnings: result.meta.warnings,
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
      return {
        mode: "demo" as const,
        source: "Datos demostrativos locales",
        fetchedAt: new Date().toISOString(),
        warnings: [
          ...warnings,
          "Sin claves activas o cobertura disponible: se muestran datos demostrativos.",
        ],
        matches,
      };
    },

    async getById(id: string): Promise<MatchDataset | null> {
      if (id === demoDataset.match.id) return structuredClone(demoDataset);
      for (const provider of providers.football) {
        try {
          const result = await provider.getMatch(id);
          if (result.data) {
            if (
              providers.weather &&
              result.data.match.city !== "Dato no disponible"
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
            }
            if (providers.odds) {
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
