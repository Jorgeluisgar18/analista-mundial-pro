import { normalizeKickoffForAppTimeZone } from "@/lib/time/colombia";
import { matchesCompetition } from "@/lib/providers/competitionCatalog";
import type {
  Fetcher,
  FootballProvider,
  ProviderResult,
  UsageReporter,
} from "@/lib/providers/types";
import { emitUsage } from "@/lib/providers/types";
import type { Evidence, MatchDataset, NormalizedMatch } from "@/types/domain";

interface FootballdataIoResponse {
  success?: boolean;
  data?: unknown[] | { matches?: unknown[] | null } | null | unknown;
  meta?: {
    requests_used?: number;
    requests_limit?: number;
    requests_remaining?: number;
  };
}

const DEFAULT_BASE_URL = "https://footballdata.io/api/v1";
const FREE_PLAN_MONTHLY_LIMIT = 2000;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function dataRecord(body: FootballdataIoResponse) {
  return asRecord(body.data);
}

function primaryRecord(body: FootballdataIoResponse) {
  const data = asRecord(body.data);
  return asRecord(data.match ?? data.fixture ?? data);
}

function matchesFromBody(data: FootballdataIoResponse["data"]) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const matches = (data as { matches?: unknown }).matches;
    if (Array.isArray(matches)) return matches;
  }
  return [];
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function safeCode(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0])
    .join("")
    .padEnd(3, name.slice(0, 3))
    .slice(0, 3)
    .toUpperCase();
}

function statusFromProvider(value: unknown): NormalizedMatch["status"] {
  const status = String(value ?? "").toLowerCase();
  if (["finished", "complete", "completed", "ft", "aet", "pen"].includes(status)) {
    return "finished";
  }
  if (["live", "in_play", "in-play", "1h", "2h", "ht"].includes(status)) {
    return "live";
  }
  if (["postponed", "suspended", "cancelled", "canceled"].includes(status)) {
    return "suspended";
  }
  return "scheduled";
}

function teamFromProvider(
  team: Record<string, unknown>,
  fallbackName: string,
  colors: [string, string],
) {
  const name = stringValue(team.name, team.team_name, team.short_name) ?? fallbackName;
  return {
    id: stringValue(team.id, team.team_id, name) ?? name,
    name,
    code:
      stringValue(team.code, team.tla, team.short_name, team.abbreviation) ??
      safeCode(name),
    colors,
    logoUrl: stringValue(team.logo, team.logo_url, team.badge, team.crest),
  };
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function scoreTuple(
  home: Record<string, unknown>,
  away: Record<string, unknown>,
  match: Record<string, unknown>,
): [number, number] | undefined {
  const homeGoals = numberValue(
    match.home_score,
    match.home_goals,
    match.score_home,
    home.score,
    home.goals,
  );
  const awayGoals = numberValue(
    match.away_score,
    match.away_goals,
    match.score_away,
    away.score,
    away.goals,
  );
  return homeGoals !== undefined && awayGoals !== undefined
    ? [homeGoals, awayGoals]
    : undefined;
}

function normalizeTeamStats(stats: Record<string, unknown>, elo: number) {
  return {
    elo,
    recentPointsPerGame: numberValue(
      stats.points_per_game,
      stats.ppg,
      stats.recent_points_per_game,
    ) ?? 1.45,
    goalsFor: numberValue(
      stats.goals_for_avg,
      stats.goalsForAvg,
      stats.avg_goals_for,
      stats.goals_for,
    ) ?? 1.35,
    goalsAgainst: numberValue(
      stats.goals_against_avg,
      stats.goalsAgainstAvg,
      stats.avg_goals_against,
      stats.goals_against,
    ) ?? 1.25,
    xgFor: numberValue(stats.xg_for, stats.xgFor),
    xgAgainst: numberValue(stats.xg_against, stats.xgAgainst),
    shots: numberValue(stats.shots_avg, stats.shots, stats.avg_shots) ?? 10.5,
    shotsOnTarget:
      numberValue(
        stats.shots_on_target_avg,
        stats.shotsOnTarget,
        stats.avg_shots_on_target,
      ) ?? 3.7,
    corners:
      numberValue(stats.corners_avg, stats.corners, stats.avg_corners) ?? 4.6,
    cards: numberValue(stats.cards_avg, stats.cards, stats.avg_cards) ?? 2.1,
    fouls: numberValue(stats.fouls_avg, stats.fouls, stats.avg_fouls) ?? 11.2,
    offsides:
      numberValue(stats.offsides_avg, stats.offsides, stats.avg_offsides) ??
      1.5,
    cleanSheetRate:
      numberValue(
        stats.clean_sheet_rate,
        stats.cleanSheetRate,
        stats.clean_sheets_rate,
      ) ?? 0.28,
  };
}

function formatPercent(value?: number) {
  return value === undefined ? undefined : `${Math.round(value * 100)}%`;
}

function probabilityDetail(probabilities: Record<string, unknown>) {
  const home = numberValue(
    probabilities.home_win,
    probabilities.home,
    probabilities.local,
  );
  const draw = numberValue(probabilities.draw, probabilities.tie);
  const away = numberValue(
    probabilities.away_win,
    probabilities.away,
    probabilities.visitor,
  );
  if (home === undefined && draw === undefined && away === undefined) {
    return undefined;
  }
  return `Probabilidades proveedor: local ${formatPercent(home) ?? "N/D"}, empate ${formatPercent(draw) ?? "N/D"}, visitante ${formatPercent(away) ?? "N/D"}.`;
}

function normalizedCompetitionName(
  competitionName: string,
  country: string,
  match: Record<string, unknown>,
) {
  const normalized = competitionName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  const homeName = String(
    asRecord(match.home_team ?? match.homeTeam ?? match.home).name ?? "",
  ).toLowerCase();
  const awayName = String(
    asRecord(match.away_team ?? match.awayTeam ?? match.away).name ?? "",
  ).toLowerCase();
  const looksGeneric =
    !normalized ||
    ["competicion", "competition", "international"].includes(normalized);
  const looksNational =
    country.toLowerCase().includes("international") ||
    homeName.includes("national team") ||
    awayName.includes("national team");

  return looksGeneric && looksNational
    ? "International World Cup"
    : competitionName;
}

export class FootballdataIoProvider implements FootballProvider {
  readonly id = "footballdata-io";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly usageReporter?: UsageReporter,
    private readonly baseUrl = DEFAULT_BASE_URL,
  ) {}

  async listMatches(
    date: string,
    competition?: string,
  ): Promise<ProviderResult<NormalizedMatch[]>> {
    const url = new URL(`${this.baseUrl}/matches/date/${date}`);
    if (competition && competition !== "all") {
      url.searchParams.set("league", competition);
    }

    const response = await this.fetcher(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Footballdata.io respondio ${response.status}`);
    }

    const body = (await response.json()) as FootballdataIoResponse;
    const used = body.meta?.requests_used;
    const limit = body.meta?.requests_limit ?? FREE_PLAN_MONTHLY_LIMIT;
    await emitUsage(this.usageReporter, {
      provider: "Footballdata.io",
      period: "month",
      limit,
      used,
      remaining: body.meta?.requests_remaining,
    });

    const fetchedAt = new Date().toISOString();
    return {
      data: matchesFromBody(body.data)
        .map((item) => this.normalizeMatch(item, fetchedAt))
        .filter((match): match is NormalizedMatch => Boolean(match))
        .filter((match) => match.date === date)
        .filter((match) => matchesCompetition(competition, match.competition)),
      meta: {
        source: "Footballdata.io",
        fetchedAt,
        isStale: false,
        warnings: [],
        quota: {
          used,
          limit,
          remaining: body.meta?.requests_remaining,
        },
      },
    };
  }

  async getMatch(id: string): Promise<ProviderResult<MatchDataset | null>> {
    const [matchBody, statsBody, probabilitiesBody] = await Promise.all([
      this.request(`matches/${id}`),
      this.request(`matches/${id}/stats`).catch(() => undefined),
      this.request(`matches/${id}/probabilities`).catch(() => undefined),
    ]);
    const fetchedAt = new Date().toISOString();
    const matchRecord = primaryRecord(matchBody);
    const match = this.normalizeMatch(matchRecord, fetchedAt);
    if (!match) {
      return {
        data: null,
        meta: {
          source: "Footballdata.io",
          fetchedAt,
          isStale: false,
          warnings: ["Partido no encontrado en Footballdata.io."],
        },
      };
    }

    const stats = dataRecord(statsBody ?? {});
    const probabilities = dataRecord(probabilitiesBody ?? {});
    const homeStats = normalizeTeamStats(asRecord(stats.home), 1505);
    const awayStats = normalizeTeamStats(asRecord(stats.away), 1495);
    const probabilitySource = probabilityDetail(probabilities);

    const unavailableEvidence = (
      value: string,
      source: string,
    ): Evidence<string> => ({
      value,
      status: "unavailable",
      sourceType: "provider",
      source,
      observedAt: fetchedAt,
    });

    const dataset: MatchDataset = {
      match,
      home: homeStats,
      away: awayStats,
      lineups: [match.homeTeam, match.awayTeam].map((team) => ({
        teamId: team.id,
        formation: unavailableEvidence(
          "Dato no disponible en Footballdata.io",
          "Footballdata.io",
        ),
        confirmed: false,
        starters: [],
      })),
      availability: [],
      players: [],
      odds: [],
      referee: {
        value:
          stringValue(matchRecord.referee, matchRecord.official) ??
          "Dato no disponible en Footballdata.io",
        status: stringValue(matchRecord.referee, matchRecord.official)
          ? "confirmed"
          : "unavailable",
        sourceType: "provider",
        source: "Footballdata.io",
        observedAt: fetchedAt,
      },
      weather: unavailableEvidence(
        "Dato no disponible en Footballdata.io",
        "Open-Meteo pendiente",
      ),
      context: {
        homeNeed: "Contexto competitivo enriquecido por proveedor complementario pendiente de tabla.",
        awayNeed: "Contexto competitivo enriquecido por proveedor complementario pendiente de tabla.",
        homeMotivation: "Inferencia por fase, liga y condición local.",
        awayMotivation: "Inferencia por fase, liga y condición visitante.",
        pressure:
          probabilitySource ??
          "Presión estimada con priors hasta disponer de tabla/probabilidades.",
        tacticalSummary:
          "Dataset complementario de Footballdata.io: útil para contraste de calendario, forma base y señales de probabilidad.",
      },
      sources: [
        {
          id: "footballdata-io-match",
          label: "Footballdata.io · match",
          type: "provider",
          status: "confirmed",
          observedAt: fetchedAt,
          detail: "Identidad, sede, equipos, torneo y estado del partido.",
        },
        {
          id: "footballdata-io-stats",
          label: "Footballdata.io · stats",
          type: "provider",
          status: Object.keys(stats).length ? "confirmed" : "unavailable",
          observedAt: fetchedAt,
          detail: Object.keys(stats).length
            ? "Estadísticas normalizadas de equipos."
            : "Stats no disponibles en la respuesta actual.",
        },
        {
          id: "footballdata-io-probabilities",
          label: "Footballdata.io · probabilities",
          type: "provider",
          status: probabilitySource ? "expected" : "unavailable",
          observedAt: fetchedAt,
          detail:
            probabilitySource ??
            "Probabilidades no disponibles en la respuesta actual.",
        },
      ],
    };

    return {
      data: dataset,
      meta: {
        source: "Footballdata.io",
        fetchedAt,
        isStale: false,
        warnings: Object.keys(stats).length
          ? []
          : ["Footballdata.io no devolvió stats para este partido."],
      },
    };
  }

  private async request(path: string) {
    const url = new URL(`${this.baseUrl}/${path}`);
    const response = await this.fetcher(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Footballdata.io respondio ${response.status}`);
    }
    const body = (await response.json()) as FootballdataIoResponse;
    const used = body.meta?.requests_used;
    const limit = body.meta?.requests_limit ?? FREE_PLAN_MONTHLY_LIMIT;
    await emitUsage(this.usageReporter, {
      provider: "Footballdata.io",
      period: "month",
      limit,
      used,
      remaining: body.meta?.requests_remaining,
    });
    return body;
  }

  private normalizeMatch(
    item: unknown,
    fetchedAt: string,
  ): NormalizedMatch | null {
    const match = asRecord(item);
    const kickoffRaw = stringValue(
      match.date,
      match.match_date,
      match.utc_date,
      match.kickoff,
      match.kickoff_at,
      match.datetime,
      match.start_time,
    );
    if (!kickoffRaw) return null;

    const kickoff = normalizeKickoffForAppTimeZone(kickoffRaw);
    const league = asRecord(match.league ?? match.competition);
    const venue = asRecord(match.venue);
    const homeTeam = teamFromProvider(
      asRecord(match.home_team ?? match.homeTeam ?? match.home),
      "Local",
      ["#00dea5", "#173a34"],
    );
    const homeRecord = asRecord(match.home_team ?? match.homeTeam ?? match.home);
    const awayRecord = asRecord(match.away_team ?? match.awayTeam ?? match.away);
    const awayTeam = teamFromProvider(
      awayRecord,
      "Visitante",
      ["#74a8ff", "#18314a"],
    );
    const rawCompetitionName =
      stringValue(league.name, match.league_name, match.competition_name) ??
      "Competicion";
    const country =
      stringValue(league.country, match.country, venue.country) ??
      "Dato no disponible";
    const competitionName = normalizedCompetitionName(
      rawCompetitionName,
      country,
      match,
    );

    return {
      id:
        stringValue(match.id, match.match_id, match.fixture_id) ??
        `${homeTeam.id}-${awayTeam.id}-${kickoff.kickoff}`,
      date: kickoff.date,
      time: kickoff.time,
      kickoff: kickoff.kickoff,
      status: statusFromProvider(match.status),
      homeTeam,
      awayTeam,
      competition: {
        id:
          stringValue(
            league.id,
            match.league_id,
            match.competition_id,
            competitionName,
          ) ?? competitionName,
        name: competitionName,
        kind: competitionName.toLowerCase().includes("world")
          ? "NATIONAL"
          : "CLUB",
        stage: stringValue(match.stage, match.round, match.matchday),
      },
      venue:
        stringValue(venue.name, match.venue_name, match.venue) ??
        "Dato no disponible",
      city: stringValue(venue.city, match.city) ?? "Dato no disponible",
      country,
      timezone: kickoff.timezone,
      dataOrigin: "API",
      fetchedAt,
      scoreFullTime: scoreTuple(homeRecord, awayRecord, match),
    };
  }
}
