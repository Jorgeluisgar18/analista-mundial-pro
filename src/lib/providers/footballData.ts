import type {
  Fetcher,
  FootballProvider,
  ProviderResult,
  UsageReporter,
} from "@/lib/providers/types";
import { emitUsage } from "@/lib/providers/types";
import { resolveFootballDataCompetition } from "@/lib/providers/competitionCatalog";
import {
  normalizeKickoffForAppTimeZone,
  nextIsoDate,
} from "@/lib/time/colombia";
import type { MatchDataset, NormalizedMatch } from "@/types/domain";

export class FootballDataProvider implements FootballProvider {
  readonly id = "football-data";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly usageReporter?: UsageReporter,
  ) {}

  async listMatches(
    date: string,
    competition?: string,
  ): Promise<ProviderResult<NormalizedMatch[]>> {
    const url = new URL("https://api.football-data.org/v4/matches");
    url.searchParams.set("dateFrom", date);
    url.searchParams.set("dateTo", nextIsoDate(date));
    const competitionCode = resolveFootballDataCompetition(competition);
    if (competitionCode) {
      url.searchParams.set("competitions", competitionCode);
    }
    const response = await this.fetcher(url, {
      headers: { "X-Auth-Token": this.apiKey },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    await emitUsage(this.usageReporter, {
      provider: "Football-Data.org",
      period: "minute",
      limit: 10,
    });
    if (!response.ok) {
      throw new Error(`Football-Data.org respondió ${response.status}`);
    }
    const body = (await response.json()) as {
      matches?: Array<{
        id: number;
        utcDate: string;
        status: string;
        stage?: string;
        competition: { id: number; name: string; area?: { name?: string } };
        homeTeam: { id: number; name: string; tla?: string };
        awayTeam: { id: number; name: string; tla?: string };
      }>;
    };
    return {
      data: (body.matches ?? [])
        .map((item) => {
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
          },
          awayTeam: {
            id: String(item.awayTeam.id),
            name: item.awayTeam.name,
            code: item.awayTeam.tla ?? item.awayTeam.name.slice(0, 3).toUpperCase(),
            colors: ["#74a8ff", "#18314a"],
          },
          competition: {
            id: String(item.competition.id),
            name: item.competition.name,
            kind: item.competition.name.toLowerCase().includes("world")
              ? "NATIONAL"
              : "CLUB",
            stage: item.stage,
          },
          venue: "Dato no disponible",
          city: "Dato no disponible",
          country: item.competition.area?.name ?? "Dato no disponible",
          timezone: kickoff.timezone,
          dataOrigin: "API",
          fetchedAt: new Date().toISOString(),
        } satisfies NormalizedMatch;
      })
        .filter((match) => match.date === date),
      meta: {
        source: "Football-Data.org",
        fetchedAt: new Date().toISOString(),
        isStale: false,
        warnings: [],
      },
    };
  }

  async getMatch(id: string): Promise<ProviderResult<MatchDataset | null>> {
    void id;
    return {
      data: null,
      meta: {
        source: "Football-Data.org",
        fetchedAt: new Date().toISOString(),
        isStale: false,
        warnings: ["Este proveedor se usa como respaldo de calendario."],
      },
    };
  }
}
