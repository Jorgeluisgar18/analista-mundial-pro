import { normalizeOddOutcome } from "@/lib/models/odds";
import type {
  Fetcher,
  OddsProvider,
  ProviderResult,
  UsageReporter,
} from "@/lib/providers/types";
import { emitUsage } from "@/lib/providers/types";
import type { NormalizedMatch, NormalizedOdds } from "@/types/domain";

const DEFAULT_BASE_URL = "https://api.the-odds-api.com/v4";
const DEFAULT_REGIONS = "eu";
const DEFAULT_MARKETS = "h2h";
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_EVENT_MATCH_WINDOW_HOURS = 36;

export interface TheOddsApiProviderOptions {
  baseUrl?: string;
  regions?: string;
  markets?: string;
  bookmakers?: string;
  timeoutMs?: number;
  eventMatchWindowHours?: number;
}

interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}

interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
  description?: string;
}

interface OddsApiMarket {
  key: string;
  last_update?: string;
  outcomes: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  title: string;
  key?: string;
  last_update?: string;
  markets: OddsApiMarket[];
}

interface OddsApiEventOdds extends OddsApiEvent {
  bookmakers?: OddsApiBookmaker[];
}

export function oddsSportKey(match: NormalizedMatch) {
  const competition =
    `${match.competition.id} ${match.competition.name}`.toLowerCase();
  if (competition.includes("premier") || competition.includes("epl")) {
    return "soccer_epl";
  }
  if (competition.includes("champions")) {
    return "soccer_uefa_champs_league";
  }
  if (competition.includes("europa league")) {
    return "soccer_uefa_europa_league";
  }
  if (competition.includes("la liga") || competition.includes("laliga")) {
    return "soccer_spain_la_liga";
  }
  if (competition.includes("bundesliga")) {
    return "soccer_germany_bundesliga";
  }
  if (competition.includes("serie a")) {
    return "soccer_italy_serie_a";
  }
  if (competition.includes("ligue 1")) {
    return "soccer_france_ligue_one";
  }
  if (
    competition.includes("world cup") ||
    competition.includes("mundial") ||
    competition.includes("fifa")
  ) {
    return "soccer_fifa_world_cup";
  }
  return undefined;
}

function parseHeaderNumber(headers: Headers, name: string) {
  const value = headers.get(name);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function quotaFromHeaders(headers: Headers) {
  const used = parseHeaderNumber(headers, "x-requests-used");
  const remaining = parseHeaderNumber(headers, "x-requests-remaining");
  const last = parseHeaderNumber(headers, "x-requests-last");
  return {
    used,
    remaining,
    last,
    limit:
      used !== undefined && remaining !== undefined ? used + remaining : undefined,
  };
}

function normalizeTeamName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(fc|cf|club|de|la|el|the|sc|ac|cd|ud)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function teamNamesMatch(left: string, right: string) {
  const a = normalizeTeamName(left);
  const b = normalizeTeamName(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function hoursBetween(leftIso: string, rightIso: string) {
  return Math.abs(new Date(leftIso).getTime() - new Date(rightIso).getTime()) /
    3_600_000;
}

function eventMatches(event: OddsApiEvent, match: NormalizedMatch, windowHours: number) {
  const directTeams =
    teamNamesMatch(event.home_team, match.homeTeam.name) &&
    teamNamesMatch(event.away_team, match.awayTeam.name);
  const swappedTeams =
    teamNamesMatch(event.home_team, match.awayTeam.name) &&
    teamNamesMatch(event.away_team, match.homeTeam.name);
  return (
    (directTeams || swappedTeams) &&
    hoursBetween(event.commence_time, match.kickoff) <= windowHours
  );
}

function normalizeOutcome(outcome: OddsApiOutcome) {
  const rawName =
    outcome.point === undefined
      ? outcome.description
        ? `${outcome.name} ${outcome.description}`
        : outcome.name
      : `${outcome.name} ${outcome.point}`;
  return normalizeOddOutcome(rawName);
}

export class TheOddsApiProvider implements OddsProvider {
  readonly id = "the-odds-api";

  private readonly baseUrl: string;
  private readonly regions: string;
  private readonly markets: string;
  private readonly bookmakers?: string;
  private readonly timeoutMs: number;
  private readonly eventMatchWindowHours: number;

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly usageReporter?: UsageReporter,
    options: TheOddsApiProviderOptions = {},
  ) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.regions = options.regions ?? DEFAULT_REGIONS;
    this.markets = options.markets ?? DEFAULT_MARKETS;
    this.bookmakers = options.bookmakers;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.eventMatchWindowHours =
      options.eventMatchWindowHours ?? DEFAULT_EVENT_MATCH_WINDOW_HOURS;
  }

  async getOdds(
    match: NormalizedMatch,
  ): Promise<ProviderResult<NormalizedOdds[]>> {
    const fetchedAt = new Date().toISOString();
    const sportKey = oddsSportKey(match);
    if (!sportKey) {
      return {
        data: [],
        meta: {
          source: "The Odds API",
          fetchedAt,
          isStale: false,
          warnings: [
            `Competición no soportada por The Odds API: ${match.competition.name}.`,
          ],
        },
      };
    }

    const events = await this.fetchEvents(sportKey);
    const event = events.find((candidate) =>
      eventMatches(candidate, match, this.eventMatchWindowHours),
    );
    if (!event) {
      return {
        data: [],
        meta: {
          source: "The Odds API",
          fetchedAt,
          isStale: false,
          warnings: [
            "Partido no encontrado en /events de The Odds API; no se consumió cuota de odds.",
          ],
        },
      };
    }

    const { eventOdds, headers } = await this.fetchEventOdds(sportKey, event.id);
    const quota = quotaFromHeaders(headers);
    await emitUsage(this.usageReporter, {
      provider: "The Odds API",
      period: "month",
      limit: quota.limit ?? 500,
      used: quota.used,
      remaining: quota.remaining,
    });

    const odds = normalizeEventOdds(eventOdds);
    return {
      data: odds,
      meta: {
        source: "The Odds API",
        fetchedAt,
        isStale: false,
        warnings: odds.length
          ? []
          : [
              "The Odds API encontró el evento, pero no devolvió mercados activos para la configuración actual.",
            ],
        quota: {
          used: quota.used,
          remaining: quota.remaining,
          limit: quota.limit,
        },
      },
    };
  }

  private buildUrl(path: string) {
    const baseUrl = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;
    return new URL(`${baseUrl}${path}`);
  }

  private requestOptions(): RequestInit {
    return {
      signal: AbortSignal.timeout(this.timeoutMs),
      cache: "no-store",
    };
  }

  private async fetchEvents(sportKey: string) {
    const url = this.buildUrl(`/sports/${sportKey}/events`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("dateFormat", "iso");

    const response = await this.fetcher(url, this.requestOptions());
    if (!response.ok) {
      throw new Error(`The Odds API /events respondió ${response.status}`);
    }
    return (await response.json()) as OddsApiEvent[];
  }

  private async fetchEventOdds(sportKey: string, eventId: string) {
    const url = this.buildUrl(`/sports/${sportKey}/events/${eventId}/odds`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("regions", this.regions);
    url.searchParams.set("markets", this.markets);
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("dateFormat", "iso");
    if (this.bookmakers) {
      url.searchParams.set("bookmakers", this.bookmakers);
    }

    const response = await this.fetcher(url, this.requestOptions());
    if (!response.ok) {
      const detail =
        response.status === 429
          ? "límite de cuota o rate limit alcanzado"
          : `estado ${response.status}`;
      throw new Error(`The Odds API /event odds respondió ${detail}`);
    }
    return {
      eventOdds: (await response.json()) as OddsApiEventOdds,
      headers: response.headers,
    };
  }
}

function normalizeEventOdds(event: OddsApiEventOdds): NormalizedOdds[] {
  return (
    event.bookmakers?.flatMap((bookmaker) =>
      bookmaker.markets.flatMap((market) =>
        market.outcomes.map((outcome) => ({
          bookmaker: bookmaker.title,
          market: market.key,
          outcome: normalizeOutcome(outcome),
          odd: outcome.price,
          observedAt:
            market.last_update ??
            bookmaker.last_update ??
            new Date().toISOString(),
        })),
      ),
    ) ?? []
  );
}
