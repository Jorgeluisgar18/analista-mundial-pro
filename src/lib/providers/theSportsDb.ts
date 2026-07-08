import type {
  MatchDataset,
  NormalizedMatch,
  SourceRecord,
  TeamRef,
} from "@/types/domain";
import { resilientFetch } from "@/lib/providers/http";

interface TheSportsDbConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
}

interface EventsByDayResponse {
  events: unknown[] | null;
}

interface SearchTeamsResponse {
  teams: unknown[] | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(brasil)\b/g, "brazil")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(left?: string, right?: string) {
  if (!left || !right) return false;
  const a = normalizeText(left);
  const b = normalizeText(right);
  return a === b || a.includes(b) || b.includes(a);
}

function eventMatches(event: Record<string, unknown>, match: NormalizedMatch) {
  return (
    stringValue(event.dateEvent) === match.date &&
    namesMatch(stringValue(event.strHomeTeam), match.homeTeam.name) &&
    namesMatch(stringValue(event.strAwayTeam), match.awayTeam.name)
  );
}

function teamBadge(team: Record<string, unknown>) {
  return stringValue(
    team.strTeamBadge,
    team.strTeamLogo,
    team.strTeamJersey,
    team.strTeamFanart1,
  );
}

function enrichTeam(team: TeamRef, sportsDbTeam?: Record<string, unknown>): TeamRef {
  if (!sportsDbTeam) return team;
  return {
    ...team,
    logoUrl: team.logoUrl ?? teamBadge(sportsDbTeam),
  };
}

export class TheSportsDbClient {
  private readonly fetcher: typeof fetch;

  constructor(private readonly config: TheSportsDbConfig) {
    this.fetcher = config.fetcher ?? fetch;
  }

  async request<T>(endpoint: string, params: Record<string, string>) {
    const url = new URL(
      `${this.config.baseUrl}/${this.config.apiKey}/${endpoint}`,
    );
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await resilientFetch(this.fetcher, url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(this.config.timeoutMs),
      retryLabel: "TheSportsDB",
    });
    if (response.status === 429) {
      throw new Error("TheSportsDB rate limit reached");
    }
    if (!response.ok) {
      throw new Error(`TheSportsDB request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  async eventsByDay(date: string) {
    const body = await this.request<EventsByDayResponse>("eventsday.php", {
      d: date,
      s: "Soccer",
    });
    return body.events ?? [];
  }

  async searchTeams(teamName: string) {
    const body = await this.request<SearchTeamsResponse>("searchteams.php", {
      t: teamName,
    });
    return body.teams ?? [];
  }
}

export class TheSportsDbEnrichmentProvider {
  readonly id = "the-sportsdb";
  private readonly client: TheSportsDbClient;

  constructor(config: TheSportsDbConfig) {
    this.client = new TheSportsDbClient(config);
  }

  async enrich(dataset: MatchDataset) {
    const fetchedAt = new Date().toISOString();
    const [events, homeTeams, awayTeams] = await Promise.all([
      this.client.eventsByDay(dataset.match.date).catch(() => []),
      this.client.searchTeams(dataset.match.homeTeam.name).catch(() => []),
      this.client.searchTeams(dataset.match.awayTeam.name).catch(() => []),
    ]);

    const event = events.map(asRecord).find((item) =>
      eventMatches(item, dataset.match),
    );
    const homeTeam = homeTeams
      .map(asRecord)
      .find((item) =>
        namesMatch(stringValue(item.strTeam), dataset.match.homeTeam.name),
      );
    const awayTeam = awayTeams
      .map(asRecord)
      .find((item) =>
        namesMatch(stringValue(item.strTeam), dataset.match.awayTeam.name),
      );

    const enriched: MatchDataset = structuredClone(dataset);
    enriched.match = {
      ...enriched.match,
      homeTeam: enrichTeam(enriched.match.homeTeam, homeTeam),
      awayTeam: enrichTeam(enriched.match.awayTeam, awayTeam),
      venue:
        enriched.match.venue === "Dato no disponible"
          ? stringValue(event?.strVenue) ?? enriched.match.venue
          : enriched.match.venue,
      city:
        enriched.match.city === "Dato no disponible"
          ? stringValue(event?.strCity) ?? enriched.match.city
          : enriched.match.city,
      country:
        enriched.match.country === "Dato no disponible"
          ? stringValue(event?.strCountry) ?? enriched.match.country
          : enriched.match.country,
    };

    const additions = [
      homeTeam || awayTeam ? "escudos de equipos" : undefined,
      event ? "evento/venue" : undefined,
    ].filter(Boolean);
    const source: SourceRecord = {
      id: "thesportsdb-enrichment",
      label: "TheSportsDB · enriquecimiento",
      type: "provider",
      status: additions.length ? "confirmed" : "unavailable",
      observedAt: fetchedAt,
      detail: additions.length
        ? `Contexto enriquecido: ${additions.join(", ")}.`
        : "TheSportsDB no encontró contexto adicional para este partido.",
    };
    enriched.sources.push(source);

    return {
      data: enriched,
      meta: {
        source: "TheSportsDB",
        fetchedAt,
        isStale: false,
        warnings: additions.length
          ? []
          : ["TheSportsDB no encontró contexto adicional para este partido."],
      },
    };
  }
}
