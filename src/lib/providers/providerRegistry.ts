import { ApiFootballProvider } from "@/lib/providers/apiFootball";
import { FootballDataProvider } from "@/lib/providers/footballData";
import { OpenMeteoProvider } from "@/lib/providers/openMeteo";
import { TheOddsApiProvider } from "@/lib/providers/oddsApi";
import type { ProviderUsageEvent } from "@/lib/providers/types";

export interface ProviderEnvironment {
  FOOTBALL_API_KEY?: string;
  FOOTBALL_DATA_API_KEY?: string;
  THE_SPORTSDB_API_KEY?: string;
  THE_SPORTSDB_BASE_URL?: string;
  THE_SPORTSDB_TIMEOUT_MS?: string;
  ODDS_API_KEY?: string;
}

export function createProviderRegistry(
  env?: ProviderEnvironment,
) {
  const resolvedEnv: ProviderEnvironment = env ?? {
    FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY,
    FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
    THE_SPORTSDB_API_KEY: process.env.THE_SPORTSDB_API_KEY,
    THE_SPORTSDB_BASE_URL: process.env.THE_SPORTSDB_BASE_URL,
    THE_SPORTSDB_TIMEOUT_MS: process.env.THE_SPORTSDB_TIMEOUT_MS,
    ODDS_API_KEY: process.env.ODDS_API_KEY,
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
    ],
    odds: resolvedEnv.ODDS_API_KEY
      ? new TheOddsApiProvider(resolvedEnv.ODDS_API_KEY, fetch, usageReporter)
      : undefined,
    weather: new OpenMeteoProvider(fetch, usageReporter),
  };
}
