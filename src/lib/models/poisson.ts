function poissonProbability(lambda: number, goals: number): number {
  if (lambda < 0 || goals < 0 || !Number.isInteger(goals)) return 0;
  let factorial = 1;
  for (let index = 2; index <= goals; index += 1) factorial *= index;
  return (Math.exp(-lambda) * Math.pow(lambda, goals)) / factorial;
}

export function poissonDistribution(lambda: number, maxGoals = 10): number[] {
  const raw = Array.from({ length: maxGoals + 1 }, (_, goals) =>
    poissonProbability(lambda, goals),
  );
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => value / total);
}

export interface ScoreMatrixResult {
  matrix: number[][];
  home: number;
  draw: number;
  away: number;
  over25: number;
  under35: number;
  bothTeamsScore: number;
}

export function scoreMatrix(
  homeLambda: number,
  awayLambda: number,
  maxGoals = 8,
  adjustment?: (homeGoals: number, awayGoals: number) => number,
): ScoreMatrixResult {
  const homeDistribution = poissonDistribution(homeLambda, maxGoals);
  const awayDistribution = poissonDistribution(awayLambda, maxGoals);
  const matrix = homeDistribution.map((homeProbability, homeGoals) =>
    awayDistribution.map(
      (awayProbability, awayGoals) =>
        homeProbability *
        awayProbability *
        (adjustment?.(homeGoals, awayGoals) ?? 1),
    ),
  );
  const rawTotal = matrix.flat().reduce((sum, value) => sum + value, 0);
  const normalized = matrix.map((row) => row.map((value) => value / rawTotal));

  let home = 0;
  let draw = 0;
  let away = 0;
  let over25 = 0;
  let under35 = 0;
  let bothTeamsScore = 0;

  normalized.forEach((row, homeGoals) => {
    row.forEach((probability, awayGoals) => {
      if (homeGoals > awayGoals) home += probability;
      else if (homeGoals === awayGoals) draw += probability;
      else away += probability;
      if (homeGoals + awayGoals >= 3) over25 += probability;
      if (homeGoals + awayGoals <= 3) under35 += probability;
      if (homeGoals > 0 && awayGoals > 0) bothTeamsScore += probability;
    });
  });

  return {
    matrix: normalized,
    home,
    draw,
    away,
    over25,
    under35,
    bothTeamsScore,
  };
}
