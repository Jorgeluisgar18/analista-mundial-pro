import type { CompetitionKind, CompetitionRef } from "@/types/domain";

export interface SupportedCompetition {
  slug: string;
  name: string;
  kind: CompetitionKind;
  aliases: string[];
  footballDataCode?: string;
  apiFootballLeagueId?: number;
}

export const supportedCompetitions: SupportedCompetition[] = [
  {
    slug: "wc-2026",
    name: "FIFA World Cup",
    kind: "NATIONAL",
    aliases: ["fifa world cup", "world cup", "mundial"],
    footballDataCode: "WC",
    apiFootballLeagueId: 1,
  },
  {
    slug: "premier-league",
    name: "Premier League",
    kind: "CLUB",
    aliases: ["premier league", "epl"],
    footballDataCode: "PL",
    apiFootballLeagueId: 39,
  },
  {
    slug: "champions-league",
    name: "UEFA Champions League",
    kind: "CLUB",
    aliases: ["uefa champions league", "champions league"],
    footballDataCode: "CL",
    apiFootballLeagueId: 2,
  },
  {
    slug: "europa-league",
    name: "UEFA Europa League",
    kind: "CLUB",
    aliases: ["uefa europa league", "europa league"],
    footballDataCode: "EL",
    apiFootballLeagueId: 3,
  },
  {
    slug: "la-liga",
    name: "La Liga",
    kind: "CLUB",
    aliases: ["la liga", "laliga", "primera division"],
    footballDataCode: "PD",
    apiFootballLeagueId: 140,
  },
  {
    slug: "bundesliga",
    name: "Bundesliga",
    kind: "CLUB",
    aliases: ["bundesliga"],
    footballDataCode: "BL1",
    apiFootballLeagueId: 78,
  },
  {
    slug: "serie-a",
    name: "Serie A",
    kind: "CLUB",
    aliases: ["serie a"],
    footballDataCode: "SA",
    apiFootballLeagueId: 135,
  },
  {
    slug: "ligue-1",
    name: "Ligue 1",
    kind: "CLUB",
    aliases: ["ligue 1"],
    footballDataCode: "FL1",
    apiFootballLeagueId: 61,
  },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function findSupportedCompetition(value?: string) {
  if (!value || value === "all") return undefined;
  const normalized = normalize(value);
  return supportedCompetitions.find(
    (competition) =>
      normalize(competition.slug) === normalized ||
      normalize(competition.name) === normalized ||
      competition.aliases.some((alias) => normalize(alias) === normalized),
  );
}

export function resolveFootballDataCompetition(value?: string) {
  const competition = findSupportedCompetition(value);
  if (competition?.footballDataCode) return competition.footballDataCode;
  if (value && /^[A-Z0-9]+$/i.test(value)) return value.toUpperCase();
  return undefined;
}

export function resolveApiFootballLeague(value?: string) {
  const competition = findSupportedCompetition(value);
  if (competition?.apiFootballLeagueId) return competition.apiFootballLeagueId;
  if (value && /^\d+$/.test(value)) return Number(value);
  return undefined;
}

export function matchesCompetition(
  filter: string | undefined,
  competition: Pick<CompetitionRef, "id" | "name">,
) {
  if (!filter || filter === "all") return true;
  if (competition.id === filter) return true;

  const supported = findSupportedCompetition(filter);
  const candidates = supported
    ? [supported.name, ...supported.aliases]
    : [filter];
  const name = normalize(competition.name);
  return candidates.some((candidate) => name.includes(normalize(candidate)));
}
