export interface OpenFootballSourceSnapshot {
  repo: "openfootball/football.json" | "openfootball/worldcup.json";
  commit: string;
  importedAt: string;
  fileCount: number;
  matchCount: number;
}

export interface NormalizedOpenFootballMatch {
  sourceRepo: OpenFootballSourceSnapshot["repo"];
  sourceCommit: string;
  sourcePath: string;
  sourceIndex: number;
  externalId: string;
  competitionName: string;
  season: string;
  round?: string;
  group?: string;
  kickoffDate: string;
  kickoffTime?: string;
  homeTeamName: string;
  awayTeamName: string;
  scoreFullTime?: [number, number];
  scoreHalfTime?: [number, number];
  rawJson: unknown;
}
