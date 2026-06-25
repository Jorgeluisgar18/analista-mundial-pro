import type {
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

export type Fetcher = typeof fetch;
