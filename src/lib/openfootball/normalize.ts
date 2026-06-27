import { normalizeOpenFootballScore } from "@/lib/openfootball/score";
import type {
  NormalizedOpenFootballMatch,
  OpenFootballSourceSnapshot,
} from "@/lib/openfootball/types";

interface OpenFootballRawMatch {
  date?: unknown;
  time?: unknown;
  team1?: unknown;
  team2?: unknown;
  score?: unknown;
  group?: unknown;
}

interface NormalizeOpenFootballMatchInput {
  rawMatch: OpenFootballRawMatch;
  sourceRepo: OpenFootballSourceSnapshot["repo"];
  sourceCommit: string;
  sourcePath: string;
  sourceIndex: number;
  competitionName: string;
  season: string;
  round?: string;
  group?: string;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sourceRepoSlug(sourceRepo: OpenFootballSourceSnapshot["repo"]) {
  return sourceRepo.replace("/", "-").replace(".", "-");
}

export function normalizeOpenFootballMatch({
  rawMatch,
  sourceRepo,
  sourceCommit,
  sourcePath,
  sourceIndex,
  competitionName,
  season,
  round,
  group,
}: NormalizeOpenFootballMatchInput): NormalizedOpenFootballMatch {
  const score = normalizeOpenFootballScore(rawMatch.score);

  return {
    sourceRepo,
    sourceCommit,
    sourcePath,
    sourceIndex,
    externalId: `${sourceRepoSlug(sourceRepo)}:${sourceCommit}:${sourcePath}:${sourceIndex}`,
    competitionName,
    season,
    round,
    group: group ?? asString(rawMatch.group, undefined),
    kickoffDate: asString(rawMatch.date),
    kickoffTime: asString(rawMatch.time, undefined),
    homeTeamName: asString(rawMatch.team1, "Equipo local no disponible"),
    awayTeamName: asString(rawMatch.team2, "Equipo visitante no disponible"),
    scoreFullTime: score.fullTime,
    scoreHalfTime: score.halfTime,
    rawJson: rawMatch,
  };
}
