import type {
  Fetcher,
  FootballProvider,
  ProviderResult,
  UsageReporter,
} from "@/lib/providers/types";
import { emitUsage } from "@/lib/providers/types";
import {
  findSupportedCompetition,
  matchesCompetition,
  resolveApiFootballLeague,
} from "@/lib/providers/competitionCatalog";
import {
  APP_TIME_ZONE,
  normalizeKickoffForAppTimeZone,
} from "@/lib/time/colombia";
import type { MatchDataset, NormalizedMatch } from "@/types/domain";

interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
    venue: { name?: string; city?: string };
    referee?: string | null;
  };
  league: {
    id: number;
    name: string;
    round?: string;
    country?: string;
    season?: number;
  };
  teams: {
    home: { id: number; name: string; code?: string; logo?: string };
    away: { id: number; name: string; code?: string; logo?: string };
  };
}

function normalizeStatus(short: string): NormalizedMatch["status"] {
  if (short === "PST" || short === "SUSP") return "suspended";
  if (["1H", "2H", "HT", "ET", "P"].includes(short)) return "live";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  return "scheduled";
}

function shouldRetryWithoutLeague(competition?: string) {
  return findSupportedCompetition(competition)?.slug === "wc-2026";
}

export class ApiFootballProvider implements FootballProvider {
  readonly id = "api-football";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly usageReporter?: UsageReporter,
  ) {}

  private async reportUsage(response: Response) {
    const limitHeader = response.headers.get("x-ratelimit-requests-limit");
    const remainingHeader = response.headers.get(
      "x-ratelimit-requests-remaining",
    );
    const limit = limitHeader ? Number(limitHeader) : 100;
    const remaining = remainingHeader ? Number(remainingHeader) : undefined;
    await emitUsage(this.usageReporter, {
      provider: "API-Football",
      period: "day",
      limit: Number.isFinite(limit) ? limit : 100,
      remaining:
        remaining !== undefined && Number.isFinite(remaining)
          ? remaining
          : undefined,
    });
  }

  private async request<T>(
    path: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    const url = new URL(`https://v3.football.api-sports.io/${path}`);
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, String(value)),
    );
    const response = await this.fetcher(url, {
      headers: { "x-apisports-key": this.apiKey },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    await this.reportUsage(response);
    if (!response.ok) {
      throw new Error(`API-Football respondió ${response.status} en ${path}`);
    }
    const body = (await response.json()) as {
      response?: T;
      errors?: Record<string, string>;
    };
    if (body.errors && Object.keys(body.errors).length) {
      throw new Error(Object.values(body.errors).join("; "));
    }
    return body.response ?? ([] as T);
  }

  private async fetchFixtures(
    date: string,
    competition?: string,
    league?: number,
  ): Promise<{
    fixtures: ApiFootballFixture[];
    warnings: string[];
    quota?: { remaining?: number; limit?: number };
  }> {
    const url = new URL("https://v3.football.api-sports.io/fixtures");
    url.searchParams.set("date", date);
    url.searchParams.set("timezone", APP_TIME_ZONE);
    if (league) {
      url.searchParams.set("league", String(league));
    }
    const response = await this.fetcher(url, {
      headers: { "x-apisports-key": this.apiKey },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    await this.reportUsage(response);
    if (!response.ok) {
      throw new Error(`API-Football respondió ${response.status}`);
    }
    const body = (await response.json()) as {
      response?: ApiFootballFixture[];
      errors?: Record<string, string>;
    };
    return {
      fixtures: (body.response ?? []).filter((item) =>
        matchesCompetition(competition, {
          id: String(item.league.id),
          name: item.league.name,
        }),
      ),
      warnings: body.errors ? Object.values(body.errors) : [],
      quota: {
        remaining:
          Number(response.headers.get("x-ratelimit-requests-remaining") ?? "") ||
          undefined,
        limit:
          Number(response.headers.get("x-ratelimit-requests-limit") ?? "") ||
          undefined,
      },
    };
  }

  async listMatches(
    date: string,
    competition?: string,
  ): Promise<ProviderResult<NormalizedMatch[]>> {
    const leagueId = resolveApiFootballLeague(competition);
    let { fixtures, warnings, quota } = await this.fetchFixtures(
      date,
      competition,
      leagueId,
    );

    if (leagueId && fixtures.length === 0 && shouldRetryWithoutLeague(competition)) {
      const fallback = await this.fetchFixtures(date, competition, undefined);
      fixtures = fallback.fixtures;
      warnings = [
        ...warnings,
        "API-Football: World Cup sin fixtures con league ID; se reintentó búsqueda amplia filtrada.",
        ...fallback.warnings,
      ];
      quota = fallback.quota;
    }

    const matches = fixtures.map<NormalizedMatch>((item) => {
      const kickoff = normalizeKickoffForAppTimeZone(item.fixture.date);
      return {
        id: String(item.fixture.id),
        date: kickoff.date,
        time: kickoff.time,
        kickoff: kickoff.kickoff,
        status: normalizeStatus(item.fixture.status.short),
        homeTeam: {
          id: String(item.teams.home.id),
          name: item.teams.home.name,
          code:
            item.teams.home.code ??
            item.teams.home.name.slice(0, 3).toUpperCase(),
          colors: ["#00dea5", "#173a34"],
          logoUrl: item.teams.home.logo,
        },
        awayTeam: {
          id: String(item.teams.away.id),
          name: item.teams.away.name,
          code:
            item.teams.away.code ??
            item.teams.away.name.slice(0, 3).toUpperCase(),
          colors: ["#74a8ff", "#18314a"],
          logoUrl: item.teams.away.logo,
        },
        competition: {
          id: String(item.league.id),
          name: item.league.name,
          kind: item.league.name.toLowerCase().includes("world")
            ? "NATIONAL"
            : "CLUB",
          stage: item.league.round,
        },
        venue: item.fixture.venue.name ?? "Dato no disponible",
        city: item.fixture.venue.city ?? "Dato no disponible",
        country: item.league.country ?? "Dato no disponible",
        timezone: kickoff.timezone,
        dataOrigin: "API",
        fetchedAt: new Date().toISOString(),
      };
    });
    return {
      data: matches,
      meta: {
        source: "API-Football",
        fetchedAt: new Date().toISOString(),
        isStale: false,
        warnings,
        quota,
      },
    };
  }

  async getMatch(id: string): Promise<ProviderResult<MatchDataset | null>> {
    const fixtures = await this.request<ApiFootballFixture[]>("fixtures", {
      id,
    });
    const fixture = fixtures[0];
    if (!fixture) {
      return {
        data: null,
        meta: {
          source: "API-Football",
          fetchedAt: new Date().toISOString(),
          isStale: false,
          warnings: ["Fixture no encontrado."],
        },
      };
    }

    const [lineups, injuries, homeStats, awayStats] = await Promise.all([
      this.request<
        Array<{
          team: { id: number };
          formation?: string;
          startXI?: Array<{ player: { id?: number; name: string; pos?: string } }>;
        }>
      >("fixtures/lineups", { fixture: id }).catch(() => []),
      this.request<
        Array<{
          team: { id: number };
          player: { id?: number; name: string };
          type?: string;
          reason?: string;
        }>
      >("injuries", { fixture: id }).catch(() => []),
      this.request<{
        fixtures?: {
          played?: { total?: number };
          wins?: { total?: number };
          draws?: { total?: number };
        };
        goals?: {
          for?: { total?: { total?: number } };
          against?: { total?: { total?: number } };
        };
        clean_sheet?: { total?: number };
      }>("teams/statistics", {
        league: fixture.league.id,
        season: fixture.league.season ?? new Date(fixture.fixture.date).getUTCFullYear(),
        team: fixture.teams.home.id,
      }).catch(() => ({})),
      this.request<{
        fixtures?: {
          played?: { total?: number };
          wins?: { total?: number };
          draws?: { total?: number };
        };
        goals?: {
          for?: { total?: { total?: number } };
          against?: { total?: { total?: number } };
        };
        clean_sheet?: { total?: number };
      }>("teams/statistics", {
        league: fixture.league.id,
        season: fixture.league.season ?? new Date(fixture.fixture.date).getUTCFullYear(),
        team: fixture.teams.away.id,
      }).catch(() => ({})),
    ]);

    const normalizeStats = (
      stats: {
        fixtures?: {
          played?: { total?: number };
          wins?: { total?: number };
          draws?: { total?: number };
        };
        goals?: {
          for?: { total?: { total?: number } };
          against?: { total?: { total?: number } };
        };
        clean_sheet?: { total?: number };
      },
      elo: number,
    ) => {
      const played = Math.max(1, stats.fixtures?.played?.total ?? 0);
      const wins = stats.fixtures?.wins?.total ?? 0;
      const draws = stats.fixtures?.draws?.total ?? 0;
      return {
        elo,
        recentPointsPerGame: (wins * 3 + draws) / played,
        goalsFor: (stats.goals?.for?.total?.total ?? 1.35 * played) / played,
        goalsAgainst:
          (stats.goals?.against?.total?.total ?? 1.25 * played) / played,
        shots: 10.5,
        shotsOnTarget: 3.6,
        corners: 4.5,
        cards: 2.1,
        fouls: 11.5,
        offsides: 1.6,
        cleanSheetRate: (stats.clean_sheet?.total ?? 0.28 * played) / played,
      };
    };

    const normalizedMatch: NormalizedMatch = (() => {
      const kickoff = normalizeKickoffForAppTimeZone(fixture.fixture.date);
      return {
        id: String(fixture.fixture.id),
        date: kickoff.date,
        time: kickoff.time,
        kickoff: kickoff.kickoff,
        status: normalizeStatus(fixture.fixture.status.short),
        homeTeam: {
          id: String(fixture.teams.home.id),
          name: fixture.teams.home.name,
          code:
            fixture.teams.home.code ??
            fixture.teams.home.name.slice(0, 3).toUpperCase(),
          colors: ["#00dea5", "#173a34"],
          logoUrl: fixture.teams.home.logo,
        },
        awayTeam: {
          id: String(fixture.teams.away.id),
          name: fixture.teams.away.name,
          code:
            fixture.teams.away.code ??
            fixture.teams.away.name.slice(0, 3).toUpperCase(),
          colors: ["#71a9ff", "#18314a"],
          logoUrl: fixture.teams.away.logo,
        },
        competition: {
          id: String(fixture.league.id),
          name: fixture.league.name,
          kind: fixture.league.name.toLowerCase().includes("world")
            ? "NATIONAL"
            : "CLUB",
          stage: fixture.league.round,
        },
        venue: fixture.fixture.venue.name ?? "Dato no disponible",
        city: fixture.fixture.venue.city ?? "Dato no disponible",
        country: fixture.league.country ?? "Dato no disponible",
        timezone: kickoff.timezone,
        dataOrigin: "API",
        fetchedAt: new Date().toISOString(),
      };
    })();

    const lineupRows = [fixture.teams.home, fixture.teams.away].map((team) => {
      const lineup = lineups.find((item) => item.team.id === team.id);
      return {
        teamId: String(team.id),
        formation: {
          value: lineup?.formation ?? "Dato no disponible en la fuente actual",
          status: lineup ? ("confirmed" as const) : ("unavailable" as const),
          sourceType: "provider" as const,
          source: "API-Football",
          observedAt: new Date().toISOString(),
        },
        confirmed: Boolean(lineup),
        starters: lineup?.startXI?.map((row) => row.player.name) ?? [],
      };
    });

    const sources = [
      {
        id: "api-fixture",
        label: "API-Football · fixture",
        type: "provider" as const,
        status: "confirmed" as const,
        observedAt: new Date().toISOString(),
        detail: "Identidad, sede, torneo y estado del partido.",
      },
      {
        id: "api-lineups",
        label: "API-Football · alineaciones",
        type: "provider" as const,
        status: lineups.length ? ("confirmed" as const) : ("unavailable" as const),
        observedAt: new Date().toISOString(),
        detail: lineups.length
          ? "Once oficial publicado por el proveedor."
          : "Dato no disponible en la fuente actual.",
      },
      {
        id: "api-team-stats",
        label: "API-Football · estadísticas de temporada",
        type: "provider" as const,
        status: "expected" as const,
        observedAt: new Date().toISOString(),
        detail:
          "Goles y resultados del torneo; conteos no cubiertos usan priors explícitos.",
      },
    ];

    const dataset: MatchDataset = {
      match: normalizedMatch,
      home: normalizeStats(homeStats, 1500),
      away: normalizeStats(awayStats, 1500),
      lineups: lineupRows,
      availability: injuries.map((item, index) => ({
        id: `injury-${item.player.id ?? index}`,
        teamId: String(item.team.id),
        player: item.player.name,
        type: item.type?.toLowerCase().includes("susp")
          ? ("suspended" as const)
          : ("injured" as const),
        impact: item.reason ?? "Impacto táctico por evaluar.",
        evidence: {
          value: item.reason ?? item.type ?? "Baja",
          status: "confirmed",
          sourceType: "provider",
          source: "API-Football",
          observedAt: new Date().toISOString(),
        },
      })),
      players: lineups.flatMap((lineup) =>
        (lineup.startXI ?? []).map((row, index) => ({
          id: String(row.player.id ?? `${lineup.team.id}-${index}`),
          name: row.player.name,
          teamId: String(lineup.team.id),
          position: row.player.pos ?? "N/D",
          starterStatus: "confirmed" as const,
        })),
      ),
      odds: [],
      referee: {
        value:
          fixture.fixture.referee ??
          "Dato no disponible en la fuente actual",
        status: fixture.fixture.referee ? "confirmed" : "unavailable",
        sourceType: "provider",
        source: "API-Football",
        observedAt: new Date().toISOString(),
      },
      weather: {
        value: "Dato no disponible en la fuente actual",
        status: "unavailable",
        sourceType: "provider",
        source: "Open-Meteo pendiente",
        observedAt: new Date().toISOString(),
      },
      context: {
        homeNeed: "Contexto competitivo pendiente de verificación oficial.",
        awayNeed: "Contexto competitivo pendiente de verificación oficial.",
        homeMotivation: "Inferencia por fase y posición del torneo.",
        awayMotivation: "Inferencia por fase y posición del torneo.",
        pressure: "Se ajusta según fase, tabla y condición de eliminación.",
        tacticalSummary:
          "Lectura preliminar basada en formaciones y fuerza relativa.",
      },
      sources,
    };

    return {
      data: dataset,
      meta: {
        source: "API-Football",
        fetchedAt: new Date().toISOString(),
        isStale: false,
        warnings: [
          ...(lineups.length ? [] : ["Alineaciones no disponibles todavía."]),
          "Tiros, corners y disciplina usan priors cuando el plan gratuito no aporta historial detallado.",
        ],
      },
    };
  }
}
