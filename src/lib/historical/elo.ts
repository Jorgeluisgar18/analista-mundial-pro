export const BASE_FOOTBALL_ELO = 1500;
const DEFAULT_K_FACTOR = 32;
const DEFAULT_HOME_ADVANTAGE = 60;

export interface FootballEloInput {
  homeElo: number;
  awayElo: number;
  homeGoals: number;
  awayGoals: number;
  kFactor?: number;
  homeAdvantage?: number;
}

export interface HistoricalEloMatch {
  id: string;
  kickoff?: Date | null;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface FootballEloSnapshot {
  matchId: string;
  kickoff?: Date | null;
  homeTeamId: string;
  awayTeamId: string;
  homeBefore: number;
  awayBefore: number;
  homeAfter: number;
  awayAfter: number;
}

export interface OpponentEloUpdate {
  historicalMatchId: string;
  teamId: string;
  opponentElo: number;
}

function actualScore(homeGoals: number, awayGoals: number) {
  if (homeGoals > awayGoals) return 1;
  if (homeGoals === awayGoals) return 0.5;
  return 0;
}

function expectedScore(homeElo: number, awayElo: number, homeAdvantage: number) {
  return 1 / (1 + 10 ** ((awayElo - (homeElo + homeAdvantage)) / 400));
}

function marginMultiplier(homeGoals: number, awayGoals: number) {
  const margin = Math.abs(homeGoals - awayGoals);
  if (margin <= 1) return 1;
  return Math.min(1.75, 1 + Math.log(margin) * 0.18);
}

export function calculateFootballElo({
  homeElo,
  awayElo,
  homeGoals,
  awayGoals,
  kFactor = DEFAULT_K_FACTOR,
  homeAdvantage = DEFAULT_HOME_ADVANTAGE,
}: FootballEloInput) {
  const actual = actualScore(homeGoals, awayGoals);
  const expected = expectedScore(homeElo, awayElo, homeAdvantage);
  const change =
    kFactor * marginMultiplier(homeGoals, awayGoals) * (actual - expected);

  return {
    homeBefore: homeElo,
    awayBefore: awayElo,
    homeAfter: homeElo + change,
    awayAfter: awayElo - change,
  };
}

export function footballEloTimeline(
  matches: HistoricalEloMatch[],
  baseRating = BASE_FOOTBALL_ELO,
): FootballEloSnapshot[] {
  const ratings = new Map<string, number>();
  const sorted = [...matches].sort((left, right) => {
    const leftTime = left.kickoff?.getTime() ?? 0;
    const rightTime = right.kickoff?.getTime() ?? 0;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return left.id.localeCompare(right.id);
  });

  return sorted.map((match) => {
    const homeElo = ratings.get(match.homeTeamId) ?? baseRating;
    const awayElo = ratings.get(match.awayTeamId) ?? baseRating;
    const result = calculateFootballElo({
      homeElo,
      awayElo,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
    });

    ratings.set(match.homeTeamId, result.homeAfter);
    ratings.set(match.awayTeamId, result.awayAfter);

    return {
      matchId: match.id,
      kickoff: match.kickoff,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      ...result,
    };
  });
}

export function ratingForTeam(
  timeline: FootballEloSnapshot[],
  teamId: string,
  baseRating = BASE_FOOTBALL_ELO,
) {
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const snapshot = timeline[index];
    if (snapshot.homeTeamId === teamId) return snapshot.homeAfter;
    if (snapshot.awayTeamId === teamId) return snapshot.awayAfter;
  }
  return baseRating;
}

export function opponentEloUpdates(matches: HistoricalEloMatch[]) {
  return footballEloTimeline(matches).flatMap<OpponentEloUpdate>((snapshot) => [
    {
      historicalMatchId: snapshot.matchId,
      teamId: snapshot.homeTeamId,
      opponentElo: snapshot.awayBefore,
    },
    {
      historicalMatchId: snapshot.matchId,
      teamId: snapshot.awayTeamId,
      opponentElo: snapshot.homeBefore,
    },
  ]);
}
