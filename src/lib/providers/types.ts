import type {
  Evidence,
  MatchDataset,
  NormalizedMatch,
  NormalizedOdds,
} from "@/types/domain";

export interface ProviderMeta {
  source: string;
  fetchedAt: string;
  isStale: boolean;
  warnings: string[];
  quota?: {
    used?: number;
    remaining?: number;
    limit?: number;
  };
}

export interface ProviderResult<T> {
  data: T;
  meta: ProviderMeta;
}

export interface FootballProvider {
  readonly id: string;
  listMatches(
    date: string,
    competition?: string,
  ): Promise<ProviderResult<NormalizedMatch[]>>;
  getMatch(id: string): Promise<ProviderResult<MatchDataset | null>>;
}

export interface OddsProvider {
  readonly id: string;
  getOdds(match: NormalizedMatch): Promise<ProviderResult<NormalizedOdds[]>>;
}

export interface WeatherProvider {
  readonly id: string;
  getWeatherForLocation(
    city: string,
    country: string,
    kickoff: string,
  ): Promise<ProviderResult<Evidence<string>>>;
}

export type UsagePeriod = "minute" | "day" | "month" | "fair-use";

export interface ProviderUsageEvent {
  provider: string;
  period: UsagePeriod;
  limit: number;
  used?: number;
  remaining?: number;
  occurredAt?: Date;
}

export type UsageReporter = (
  event: ProviderUsageEvent,
) => Promise<void> | void;

export async function emitUsage(
  reporter: UsageReporter | undefined,
  event: ProviderUsageEvent,
) {
  if (!reporter) return;
  try {
    await reporter(event);
  } catch {
    // La telemetría nunca debe interrumpir el dato deportivo solicitado.
  }
}

export type Fetcher = typeof fetch;
