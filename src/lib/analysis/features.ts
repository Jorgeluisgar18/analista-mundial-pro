import type { MatchDataset } from "@/types/domain";

export function buildFeatures(dataset: MatchDataset) {
  const homeAttack = dataset.home.xgFor ?? dataset.home.goalsFor;
  const awayAttack = dataset.away.xgFor ?? dataset.away.goalsFor;
  const homeDefence = dataset.home.xgAgainst ?? dataset.home.goalsAgainst;
  const awayDefence = dataset.away.xgAgainst ?? dataset.away.goalsAgainst;
  const eloDelta = (dataset.home.elo - dataset.away.elo) / 400;

  const homeLambda = Math.max(
    0.25,
    homeAttack * 0.52 + awayDefence * 0.33 + 1.28 * 0.15 + eloDelta * 0.18,
  );
  const awayLambda = Math.max(
    0.25,
    awayAttack * 0.52 + homeDefence * 0.33 + 1.28 * 0.15 - eloDelta * 0.18,
  );

  return {
    homeLambda,
    awayLambda,
    expectedCorners: dataset.home.corners + dataset.away.corners,
    expectedCards: dataset.home.cards + dataset.away.cards,
    expectedFouls: dataset.home.fouls + dataset.away.fouls,
    expectedShots: dataset.home.shots + dataset.away.shots,
    expectedShotsOnTarget:
      dataset.home.shotsOnTarget + dataset.away.shotsOnTarget,
    expectedOffsides: dataset.home.offsides + dataset.away.offsides,
  };
}
