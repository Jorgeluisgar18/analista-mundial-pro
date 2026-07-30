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
import { resilientFetch } from "@/lib/providers/http";
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
  goals?: {
    home?: number | null;
    away?: number | null;
  };
}

interface ApiFootballTeamStatistics {
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
  [key: string]: unknown;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function readPath(root: unknown, path: string[]) {
  let current = root;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function numberFromPaths(root: unknown, paths: string[][]) {
  return numberValue(...paths.map((path) => readPath(root, path)));
}

function sumDefined(...values: Array<number | undefined>) {
  const present = values.filter((value): value is number => value !== undefined);
  return present.length
    ? present.reduce((total, value) => total + value, 0)
    : undefined;
}

function sumBucketTotals(root: unknown) {
  if (!isRecord(root)) return undefined;
  const totals = Object.values(root)
    .map((value) => numberFromPaths(value, [["total"], ["total", "total"]]))
    .filter((value): value is number => value !== undefined);
  return totals.length
    ? totals.reduce((total, value) => total + value, 0)
    : undefined;
}

function statisticArrayValue(root: unknown, labels: string[]) {
  if (!isRecord(root) || !Array.isArray(root.statistics)) return undefined;
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  for (const item of root.statistics) {
    if (!isRecord(item)) continue;
    const type = String(item.type ?? item.name ?? item.label ?? "").toLowerCase();
    if (!normalizedLabels.some((label) => type.includes(label))) continue;
    const value = numberValue(item.value, item.total, item.count);
    if (value !== undefined) return value;
  }
  return undefined;
}

function perGame(total: number | undefined, played: number, fallback: number) {
  return total !== undefined ? total / played : fallback;
}

function extractCountTotals(stats: ApiFootballTeamStatistics) {
  const yellowCards =
    numberFromPaths(stats, [
      ["cards", "yellow", "total"],
      ["cards", "yellow", "total", "total"],
    ]) ?? sumBucketTotals(readPath(stats, ["cards", "yellow"]));
  const redCards =
    numberFromPaths(stats, [
      ["cards", "red", "total"],
      ["cards", "red", "total", "total"],
    ]) ?? sumBucketTotals(readPath(stats, ["cards", "red"]));

  return {
    shots:
      numberFromPaths(stats, [
        ["shots", "total"],
        ["shots", "total", "total"],
        ["shots_for", "total"],
        ["shotsFor", "total"],
        ["total_shots"],
        ["shotsTotal"],
      ]) ?? statisticArrayValue(stats, ["total shots", "shots"]),
    shotsOnTarget:
      numberFromPaths(stats, [
        ["shots_on_target", "total"],
        ["shots_on_target", "total", "total"],
        ["shotsOnTarget", "total"],
        ["shots_on_goal", "total"],
        ["shotsOnGoal", "total"],
        ["target_shots"],
        ["shotsOnTargetTotal"],
      ]) ??
      statisticArrayValue(stats, [
        "shots on goal",
        "shots on target",
        "target shots",
      ]),
    corners:
      numberFromPaths(stats, [
        ["corners", "total"],
        ["corners", "total", "total"],
        ["corner_kicks", "total"],
        ["cornerKicks", "total"],
        ["cornersTotal"],
      ]) ?? statisticArrayValue(stats, ["corner kicks", "corners"]),
    cards:
      numberFromPaths(stats, [
        ["cards", "total"],
        ["cards", "total", "total"],
        ["cards_total"],
        ["cardsTotal"],
      ]) ?? sumDefined(yellowCards, redCards),
    fouls:
      numberFromPaths(stats, [
        ["fouls", "total"],
        ["fouls", "total", "total"],
        ["foulsTotal"],
      ]) ?? statisticArrayValue(stats, ["fouls"]),
    offsides:
      numberFromPaths(stats, [
        ["offsides", "total"],
        ["offsides", "total", "total"],
        ["offsidesTotal"],
      ]) ?? statisticArrayValue(stats, ["offsides"]),
  };
}

function hasDetailedCountStats(stats: ApiFootballTeamStatistics) {
  return Object.values(extractCountTotals(stats)).some(
    (value) => value !== undefined,
  );
}

function scoreFullTime(item: ApiFootballFixture): [number, number] | undefined {
  return typeof item.goals?.home === "number" &&
    typeof item.goals?.away === "number"
    ? [item.goals.home, item.goals.away]
    : undefined;
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

function seasonFromDate(date: string) {
  return Number(date.slice(0, 4));
}

function shouldUseBroadDateSearch(competition?: string) {
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
    const response = await resilientFetch(this.fetcher, url, {
      headers: { "x-apisports-key": this.apiKey },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
      retryLabel: "API-Football",
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
      url.searchParams.set("season", String(seasonFromDate(date)));
    }
    const response = await resilientFetch(this.fetcher, url, {
      headers: { "x-apisports-key": this.apiKey },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
      retryLabel: "API-Football fixtures",
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
    const leagueId = shouldUseBroadDateSearch(competition)
      ? undefined
      : resolveApiFootballLeague(competition);
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
        scoreFullTime: scoreFullTime(item),
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
      this.request<ApiFootballTeamStatistics>("teams/statistics", {
        league: fixture.league.id,
        season: fixture.league.season ?? new Date(fixture.fixture.date).getUTCFullYear(),
        team: fixture.teams.home.id,
      }).catch(() => ({})),
      this.request<ApiFootballTeamStatistics>("teams/statistics", {
        league: fixture.league.id,
        season: fixture.league.season ?? new Date(fixture.fixture.date).getUTCFullYear(),
        team: fixture.teams.away.id,
      }).catch(() => ({})),
    ]);

    const normalizeStats = (stats: ApiFootballTeamStatistics, elo: number) => {
      const played = Math.max(1, stats.fixtures?.played?.total ?? 0);
      const wins = stats.fixtures?.wins?.total ?? 0;
      const draws = stats.fixtures?.draws?.total ?? 0;
      const countTotals = extractCountTotals(stats);
      return {
        elo,
        recentPointsPerGame: (wins * 3 + draws) / played,
        goalsFor: (stats.goals?.for?.total?.total ?? 1.35 * played) / played,
        goalsAgainst:
          (stats.goals?.against?.total?.total ?? 1.25 * played) / played,
        shots: perGame(countTotals.shots, played, 10.5),
        shotsOnTarget: perGame(countTotals.shotsOnTarget, played, 3.6),
        corners: perGame(countTotals.corners, played, 4.5),
        cards: perGame(countTotals.cards, played, 2.1),
        fouls: perGame(countTotals.fouls, played, 11.5),
        offsides: perGame(countTotals.offsides, played, 1.6),
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
        scoreFullTime: scoreFullTime(fixture),
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

    const hasProviderCountStats =
      hasDetailedCountStats(homeStats) || hasDetailedCountStats(awayStats);

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
        status: hasProviderCountStats
          ? ("confirmed" as const)
          : ("expected" as const),
        observedAt: new Date().toISOString(),
        detail: hasProviderCountStats
          ? "Goles, resultados y conteos disponibles normalizados por partido."
          :
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
