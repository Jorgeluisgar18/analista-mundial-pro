import type { MatchDataset } from "@/types/domain";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function playerRoleMultiplier(position?: string) {
  const normalized = normalizeText(position ?? "");
  if (/\b(dc|st|cf|fw|ei|ed|lw|rw|delantero|wing|extremo)\b/.test(normalized)) {
    return { attack: 0.94, defence: 1.01 };
  }
  if (/\b(mco|cam|mc|cm|volante|mid|medio)\b/.test(normalized)) {
    return { attack: 0.965, defence: 1.015 };
  }
  if (/\b(df|cb|dcen|central|lateral|def|rb|lb)\b/.test(normalized)) {
    return { attack: 0.99, defence: 1.055 };
  }
  if (/\b(gk|por|arquero|keeper)\b/.test(normalized)) {
    return { attack: 1, defence: 1.075 };
  }
  return { attack: 0.975, defence: 1.025 };
}

function availabilityImpact(dataset: MatchDataset, teamId: string) {
  return dataset.availability
    .filter(
      (item) =>
        item.teamId === teamId &&
        (item.type === "injured" || item.type === "suspended"),
    )
    .reduce(
      (impact, item) => {
        const player = dataset.players.find(
          (candidate) =>
            candidate.teamId === teamId &&
            normalizeText(candidate.name) === normalizeText(item.player),
        );
        const role = playerRoleMultiplier(player?.position);
        return {
          attack: impact.attack * role.attack,
          defence: impact.defence * role.defence,
        };
      },
      { attack: 1, defence: 1 },
    );
}

export function buildFeatures(dataset: MatchDataset) {
  const homeAvailability = availabilityImpact(dataset, dataset.match.homeTeam.id);
  const awayAvailability = availabilityImpact(dataset, dataset.match.awayTeam.id);
  const homeAttack =
    (dataset.home.xgFor ?? dataset.home.goalsFor) * homeAvailability.attack;
  const awayAttack =
    (dataset.away.xgFor ?? dataset.away.goalsFor) * awayAvailability.attack;
  const homeDefence =
    (dataset.home.xgAgainst ?? dataset.home.goalsAgainst) *
    homeAvailability.defence;
  const awayDefence =
    (dataset.away.xgAgainst ?? dataset.away.goalsAgainst) *
    awayAvailability.defence;
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
