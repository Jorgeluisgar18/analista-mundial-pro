import type {
  Fetcher,
  OddsProvider,
  ProviderResult,
} from "@/lib/providers/types";
import type { NormalizedMatch, NormalizedOdds } from "@/types/domain";

export class TheOddsApiProvider implements OddsProvider {
  readonly id = "the-odds-api";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async getOdds(
    match: NormalizedMatch,
  ): Promise<ProviderResult<NormalizedOdds[]>> {
    const url = new URL(
      "https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds",
    );
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("regions", "eu");
    url.searchParams.set("markets", "h2h,totals");
    url.searchParams.set("oddsFormat", "decimal");
    const response = await this.fetcher(url, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
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
              outcome.point === undefined
                ? outcome.name
                : `${outcome.name} ${outcome.point}`,
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
