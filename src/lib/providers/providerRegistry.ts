import { ApiFootballProvider } from "@/lib/providers/apiFootball";
import { FootballDataProvider } from "@/lib/providers/footballData";
import { OpenMeteoProvider } from "@/lib/providers/openMeteo";
import { TheOddsApiProvider } from "@/lib/providers/oddsApi";
import type { ProviderUsageEvent } from "@/lib/providers/types";

export interface ProviderEnvironment {
  FOOTBALL_API_KEY?: string;
  FOOTBALL_DATA_API_KEY?: string;
  ODDS_API_KEY?: string;
}

export function createProviderRegistry(
  env?: ProviderEnvironment,
) {
  const resolvedEnv: ProviderEnvironment = env ?? {
    FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY,
    FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
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
