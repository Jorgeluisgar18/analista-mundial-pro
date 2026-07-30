import type {
  Fetcher,
  FootballProvider,
  ProviderResult,
  UsageReporter,
} from "@/lib/providers/types";
import { emitUsage } from "@/lib/providers/types";
import { resolveFootballDataCompetition } from "@/lib/providers/competitionCatalog";
import { resilientFetch } from "@/lib/providers/http";
import {
  normalizeKickoffForAppTimeZone,
  nextIsoDate,
} from "@/lib/time/colombia";
import type { MatchDataset, NormalizedMatch } from "@/types/domain";

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  stage?: string;
  venue?: string | null;
  competition: { id: number; name: string; area?: { name?: string } };
  homeTeam: { id: number; name: string; tla?: string; crest?: string };
  awayTeam: { id: number; name: string; tla?: string; crest?: string };
  score?: {
    fullTime?: {
      home?: number | null;
      away?: number | null;
    };
  };
}

async function errorDetail(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    error?: unknown;
  } | null;
  const candidate =
    typeof body?.message === "string"
      ? body.message
      : typeof body?.error === "string"
        ? body.error
        : undefined;
  return candidate?.replace(/\s+/g, " ").trim().slice(0, 180);
}

export class FootballDataProvider implements FootballProvider {
  readonly id = "football-data";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly usageReporter?: UsageReporter,
  ) {}

  private normalizeMatch(item: FootballDataMatch, fetchedAt: string): NormalizedMatch {
    const kickoff = normalizeKickoffForAppTimeZone(item.utcDate);
    return {
      id: String(item.id),
      date: kickoff.date,
      time: kickoff.time,
      kickoff: kickoff.kickoff,
      status:
        item.status === "FINISHED"
          ? "finished"
          : item.status === "IN_PLAY"
            ? "live"
            : "scheduled",
      homeTeam: {
        id: String(item.homeTeam.id),
        name: item.homeTeam.name,
        code: item.homeTeam.tla ?? item.homeTeam.name.slice(0, 3).toUpperCase(),
        colors: ["#00dea5", "#173a34"],
        logoUrl: item.homeTeam.crest,
      },
      awayTeam: {
        id: String(item.awayTeam.id),
        name: item.awayTeam.name,
        code: item.awayTeam.tla ?? item.awayTeam.name.slice(0, 3).toUpperCase(),
        colors: ["#74a8ff", "#18314a"],
        logoUrl: item.awayTeam.crest,
      },
      competition: {
        id: String(item.competition.id),
        name: item.competition.name,
        kind: item.competition.name.toLowerCase().includes("world")
          ? "NATIONAL"
          : "CLUB",
        stage: item.stage,
      },
      venue: item.venue ?? "Dato no disponible",
      city: "Dato no disponible",
      country: item.competition.area?.name ?? "Dato no disponible",
      timezone: kickoff.timezone,
      dataOrigin: "API",
      fetchedAt,
      scoreFullTime:
        typeof item.score?.fullTime?.home === "number" &&
        typeof item.score?.fullTime?.away === "number"
          ? [item.score.fullTime.home, item.score.fullTime.away]
          : undefined,
    };
  }

  async listMatches(
    date: string,
    competition?: string,
  ): Promise<ProviderResult<NormalizedMatch[]>> {
    const competitionCode = resolveFootballDataCompetition(competition);
    const url = new URL(
      competitionCode
        ? `https://api.football-data.org/v4/competitions/${competitionCode}/matches`
        : "https://api.football-data.org/v4/matches",
    );
    url.searchParams.set("dateFrom", date);
    url.searchParams.set("dateTo", nextIsoDate(date));
    const response = await resilientFetch(this.fetcher, url, {
      headers: { "X-Auth-Token": this.apiKey },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
      retryLabel: "Football-Data.org",
    });
    await emitUsage(this.usageReporter, {
      provider: "Football-Data.org",
      period: "minute",
      limit: 10,
    });
    if (!response.ok) {
      const detail = await errorDetail(response);
      throw new Error(
        `Football-Data.org respondió ${response.status}${detail ? `: ${detail}` : ""}`,
      );
    }
    const body = (await response.json()) as { matches?: FootballDataMatch[] };
    const fetchedAt = new Date().toISOString();
    return {
      data: (body.matches ?? [])
        .map((item) => this.normalizeMatch(item, fetchedAt))
        .filter((match) => match.date === date),
      meta: {
        source: "Football-Data.org",
        fetchedAt,
        isStale: false,
        warnings: [],
      },
    };
  }

  async getMatch(id: string): Promise<ProviderResult<MatchDataset | null>> {
    const fetchedAt = new Date().toISOString();
    const response = await resilientFetch(
      this.fetcher,
      new URL(`https://api.football-data.org/v4/matches/${encodeURIComponent(id)}`),
      {
        headers: { "X-Auth-Token": this.apiKey },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
        retryLabel: "Football-Data.org match",
      },
    );
    await emitUsage(this.usageReporter, {
      provider: "Football-Data.org",
      period: "minute",
      limit: 10,
    });
    if (!response.ok) {
      const detail = await errorDetail(response);
      throw new Error(
        `Football-Data.org respondió ${response.status}${detail ? `: ${detail}` : ""}`,
      );
    }
    const item = (await response.json()) as FootballDataMatch;
    if (!item?.id || !item.utcDate) {
      return {
        data: null,
        meta: {
          source: "Football-Data.org",
          fetchedAt,
          isStale: false,
          warnings: ["Partido no encontrado en Football-Data.org."],
        },
      };
    }
    const match = this.normalizeMatch(item, fetchedAt);
    const unavailable = (value: string) => ({
      value,
      status: "unavailable" as const,
      sourceType: "provider" as const,
      source: "Football-Data.org",
      observedAt: fetchedAt,
    });
    const baseForm = {
      elo: 1500,
      recentPointsPerGame: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      shots: 0,
      shotsOnTarget: 0,
      corners: 0,
      cards: 0,
      fouls: 0,
      offsides: 0,
      cleanSheetRate: 0,
    };
    return {
      data: {
        match,
        home: baseForm,
        away: { ...baseForm },
        lineups: [match.homeTeam, match.awayTeam].map((team) => ({
          teamId: team.id,
          formation: unavailable("Alineación no disponible en Football-Data.org"),
          confirmed: false,
          starters: [],
        })),
        availability: [],
        players: [],
        odds: [],
        referee: unavailable("Árbitro no disponible en Football-Data.org"),
        weather: {
          ...unavailable("Clima pendiente de Open-Meteo"),
          source: "Open-Meteo pendiente",
        },
        context: {
          homeNeed: "Contexto competitivo pendiente de una fuente complementaria.",
          awayNeed: "Contexto competitivo pendiente de una fuente complementaria.",
          homeMotivation: "Sin datos adicionales de motivación disponibles.",
          awayMotivation: "Sin datos adicionales de motivación disponibles.",
          pressure: "Presión competitiva pendiente de información complementaria.",
          tacticalSummary:
            "Cabina creada con calendario confirmado; alineaciones, cuotas y métricas requieren fuentes complementarias.",
        },
        sources: [
          {
            id: "football-data-match",
            label: "Football-Data.org · partido",
            type: "provider",
            status: "confirmed",
            observedAt: fetchedAt,
            detail: "Identidad, horario, competición y marcador cuando el proveedor lo publica.",
          },
          {
            id: "football-data-detail-coverage",
            label: "Football-Data.org · cobertura complementaria",
            type: "provider",
            status: "unavailable",
            observedAt: fetchedAt,
            detail:
              "Este proveedor no aporta en este flujo alineaciones, cuotas ni estadísticas avanzadas.",
          },
        ],
      },
      meta: {
        source: "Football-Data.org",
        fetchedAt,
        isStale: false,
        warnings: [
          "Football-Data.org confirmó el calendario; datos avanzados requieren fuentes complementarias.",
        ],
      },
    };
  }
}
