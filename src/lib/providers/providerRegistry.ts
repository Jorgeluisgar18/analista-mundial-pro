import { ApiFootballProvider } from "@/lib/providers/apiFootball";
import { FootballDataProvider } from "@/lib/providers/footballData";
import { FootballdataIoProvider } from "@/lib/providers/footballdataIo";
import { OpenMeteoProvider } from "@/lib/providers/openMeteo";
import { TheOddsApiProvider } from "@/lib/providers/oddsApi";
import { TheSportsDbEnrichmentProvider } from "@/lib/providers/theSportsDb";
import type { ProviderUsageEvent } from "@/lib/providers/types";

export interface ProviderEnvironment {
  FOOTBALL_API_KEY?: string;
  FOOTBALL_DATA_API_KEY?: string;
  FOOTBALLDATA_IO_API_KEY?: string;
  FOOTBALLDATA_IO_BASE_URL?: string;
  THE_SPORTSDB_API_KEY?: string;
  THE_SPORTSDB_BASE_URL?: string;
  THE_SPORTSDB_TIMEOUT_MS?: string;
  ODDS_API_KEY?: string;
  ODDS_API_BASE_URL?: string;
  ODDS_API_REGIONS?: string;
  ODDS_API_MARKETS?: string;
  ODDS_API_BOOKMAKERS?: string;
  ODDS_API_TIMEOUT_MS?: string;
}

function optionalNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createProviderRegistry(
  env?: ProviderEnvironment,
) {
  const resolvedEnv: ProviderEnvironment = env ?? {
    FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY,
    FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
    FOOTBALLDATA_IO_API_KEY: process.env.FOOTBALLDATA_IO_API_KEY,
    FOOTBALLDATA_IO_BASE_URL: process.env.FOOTBALLDATA_IO_BASE_URL,
    THE_SPORTSDB_API_KEY: process.env.THE_SPORTSDB_API_KEY,
    THE_SPORTSDB_BASE_URL: process.env.THE_SPORTSDB_BASE_URL,
    THE_SPORTSDB_TIMEOUT_MS: process.env.THE_SPORTSDB_TIMEOUT_MS,
    ODDS_API_KEY: process.env.ODDS_API_KEY,
    ODDS_API_BASE_URL: process.env.ODDS_API_BASE_URL,
    ODDS_API_REGIONS: process.env.ODDS_API_REGIONS,
    ODDS_API_MARKETS: process.env.ODDS_API_MARKETS,
    ODDS_API_BOOKMAKERS: process.env.ODDS_API_BOOKMAKERS,
    ODDS_API_TIMEOUT_MS: process.env.ODDS_API_TIMEOUT_MS,
  };
  const usageReporter = async (event: ProviderUsageEvent) => {
    const { recordApiUsage } = await import(
      "@/lib/services/apiUsageService"
    );
    await recordApiUsage(event);
  };
  return {
    football: [
      ...(resolvedEnv.FOOTBALL_API_KEY
        ? [new ApiFootballProvider(resolvedEnv.FOOTBALL_API_KEY, fetch, usageReporter)]
        : []),
      ...(resolvedEnv.FOOTBALL_DATA_API_KEY
        ? [
            new FootballDataProvider(
              resolvedEnv.FOOTBALL_DATA_API_KEY,
              fetch,
              usageReporter,
            ),
          ]
        : []),
      ...(resolvedEnv.FOOTBALLDATA_IO_API_KEY
        ? [
            new FootballdataIoProvider(
              resolvedEnv.FOOTBALLDATA_IO_API_KEY,
              fetch,
              usageReporter,
              resolvedEnv.FOOTBALLDATA_IO_BASE_URL,
            ),
          ]
        : []),
    ],
    odds: resolvedEnv.ODDS_API_KEY
      ? new TheOddsApiProvider(resolvedEnv.ODDS_API_KEY, fetch, usageReporter, {
          baseUrl: resolvedEnv.ODDS_API_BASE_URL,
          regions: resolvedEnv.ODDS_API_REGIONS,
          markets: resolvedEnv.ODDS_API_MARKETS,
          bookmakers: resolvedEnv.ODDS_API_BOOKMAKERS,
          timeoutMs: optionalNumber(resolvedEnv.ODDS_API_TIMEOUT_MS),
        })
      : undefined,
    enrichment: [
      ...(resolvedEnv.THE_SPORTSDB_API_KEY
        ? [
            new TheSportsDbEnrichmentProvider({
              apiKey: resolvedEnv.THE_SPORTSDB_API_KEY,
              baseUrl:
                resolvedEnv.THE_SPORTSDB_BASE_URL ??
                "https://www.thesportsdb.com/api/v1/json",
              timeoutMs: optionalNumber(resolvedEnv.THE_SPORTSDB_TIMEOUT_MS) ?? 8_000,
              fetcher: fetch,
            }),
          ]
        : []),
    ],
    weather: new OpenMeteoProvider(fetch, usageReporter),
  };
}
