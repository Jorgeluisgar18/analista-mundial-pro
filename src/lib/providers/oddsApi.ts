import type {
  Fetcher,
  OddsProvider,
  ProviderResult,
  UsageReporter,
} from "@/lib/providers/types";
import { emitUsage } from "@/lib/providers/types";
import { normalizeOddOutcome } from "@/lib/models/odds";
import type { NormalizedMatch, NormalizedOdds } from "@/types/domain";

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
  if (competition.includes("world cup") || competition.includes("mundial")) {
    return "soccer_fifa_world_cup";
  }
  return undefined;
}

export class TheOddsApiProvider implements OddsProvider {
  readonly id = "the-odds-api";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly usageReporter?: UsageReporter,
  ) {}

  async getOdds(
    match: NormalizedMatch,
  ): Promise<ProviderResult<NormalizedOdds[]>> {
    const sportKey = oddsSportKey(match);
    if (!sportKey) {
      throw new Error(
        `Competición no soportada por The Odds API: ${match.competition.name}`,
      );
    }
    const url = new URL(
      `https://api.the-odds-api.com/v4/sports/${sportKey}/odds`,
    );
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("regions", "eu");
    url.searchParams.set("markets", "h2h,totals");
    url.searchParams.set("oddsFormat", "decimal");
    const response = await this.fetcher(url, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const usedHeader = response.headers.get("x-requests-used");
    const remainingHeader = response.headers.get("x-requests-remaining");
    const used = usedHeader ? Number(usedHeader) : undefined;
    const remaining = remainingHeader ? Number(remainingHeader) : undefined;
    await emitUsage(this.usageReporter, {
      provider: "The Odds API",
      period: "month",
      limit:
        used !== undefined &&
        remaining !== undefined &&
        Number.isFinite(used) &&
        Number.isFinite(remaining)
          ? used + remaining
          : 500,
      used: used !== undefined && Number.isFinite(used) ? used : undefined,
      remaining:
        remaining !== undefined && Number.isFinite(remaining)
          ? remaining
          : undefined,
    });
    if (!response.ok) {
      throw new Error(`The Odds API respondió ${response.status}`);
    }
    const events = (await response.json()) as Array<{
      home_team: string;
      away_team: string;
      bookmakers: Array<{
        title: string;
        last_update: string;
        markets: Array<{
          key: string;
          outcomes: Array<{ name: string; price: number; point?: number }>;
        }>;
      }>;
    }>;
    const event = events.find(
      (item) =>
        item.home_team === match.homeTeam.name &&
        item.away_team === match.awayTeam.name,
    );
    const odds =
      event?.bookmakers.flatMap((bookmaker) =>
        bookmaker.markets.flatMap((market) =>
          market.outcomes.map((outcome) => ({
            bookmaker: bookmaker.title,
            market: market.key,
            outcome:
              normalizeOddOutcome(
                outcome.point === undefined
                  ? outcome.name
                  : `${outcome.name} ${outcome.point}`,
              ),
            odd: outcome.price,
            observedAt: bookmaker.last_update,
          })),
        ),
      ) ?? [];
    return {
      data: odds,
      meta: {
        source: "The Odds API",
        fetchedAt: new Date().toISOString(),
        isStale: false,
        warnings: event ? [] : ["Partido no encontrado en la cobertura actual."],
        quota: {
          remaining: Number(response.headers.get("x-requests-remaining") ?? "") || undefined,
          used: Number(response.headers.get("x-requests-used") ?? "") || undefined,
        },
      },
    };
  }
}
