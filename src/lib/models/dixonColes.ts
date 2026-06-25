import { scoreMatrix } from "@/lib/models/poisson";

export function dixonColesTau(
  homeGoals: number,
  awayGoals: number,
  homeLambda: number,
  awayLambda: number,
  rho = -0.08,
) {
  if (homeGoals === 0 && awayGoals === 0)
    return 1 - homeLambda * awayLambda * rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + homeLambda * rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + awayLambda * rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}

export function dixonColesMatrix(
  homeLambda: number,
  awayLambda: number,
  rho = -0.08,
  maxGoals = 8,
) {
  return scoreMatrix(homeLambda, awayLambda, maxGoals, (home, away) =>
    dixonColesTau(home, away, homeLambda, awayLambda, rho),
  );
}
