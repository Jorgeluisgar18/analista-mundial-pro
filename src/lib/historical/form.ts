import {
  brierScore,
  logLoss,
  rankedProbabilityScore,
} from "@/lib/backtesting/metrics";

export type HistoricalOutcome = "home" | "draw" | "away";
export type HistoricalProbabilities = Record<HistoricalOutcome, number>;

export interface HistoricalMatchForForm {
  kickoffDate: string;
  homeTeamName: string;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
  opponentElo?: number;
}

export interface HistoricalTeamFormSignal {
  matches: number;
  weightedPointsPerGame: number;
  strengthAdjustedPointsPerGame: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheetRate: number;
  source: "historical";
}

export interface CalibrationRow {
  probabilities: HistoricalProbabilities;
  outcome: HistoricalOutcome;
}

export interface CalibrationSummary {
  sampleSize: number;
  brier: number;
  logLoss: number;
  rps: number;
  empirical: HistoricalProbabilities;
  confidenceMultiplier: number;
}

export function canonicalHistoricalTeamName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(national\s+football\s+team|national\s+team|football\s+team)\b/g, "")
    .replace(/\b(the|cf|fc)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function daysBetween(left: Date, right: Date) {
  return Math.abs(left.getTime() - right.getTime()) / 86_400_000;
}

function recencyWeight(kickoffDate: string, referenceDate: Date) {
  const parsed = new Date(`${kickoffDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 0.35;
  return Math.exp(-daysBetween(parsed, referenceDate) / 365);
}

function pointsFor(goalsFor: number, goalsAgainst: number) {
  if (goalsFor > goalsAgainst) return 3;
  if (goalsFor === goalsAgainst) return 1;
  return 0;
}

function strengthMultiplier(opponentElo?: number) {
  if (!opponentElo) return 1;
  return Math.min(1.25, Math.max(0.85, 1 + (opponentElo - 1600) / 1200));
}

export function historicalFormFromMatches(
  teamName: string,
  matches: HistoricalMatchForForm[],
  referenceDate = new Date(),
): HistoricalTeamFormSignal {
  const normalizedTeam = canonicalHistoricalTeamName(teamName);
  const rows = matches
    .map((match) => {
      const isHome = canonicalHistoricalTeamName(match.homeTeamName) === normalizedTeam;
      const isAway = canonicalHistoricalTeamName(match.awayTeamName) === normalizedTeam;
      if (!isHome && !isAway) return undefined;
      const goalsFor = isHome ? match.homeGoals : match.awayGoals;
      const goalsAgainst = isHome ? match.awayGoals : match.homeGoals;
      const weight = recencyWeight(match.kickoffDate, referenceDate);
      const points = pointsFor(goalsFor, goalsAgainst);
      return {
        goalsFor,
        goalsAgainst,
        points,
        weight,
        strengthWeight: weight * strengthMultiplier(match.opponentElo),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const weightTotal = rows.reduce((sum, row) => sum + row.weight, 0);
  const safeWeight = Math.max(0.0001, weightTotal);

  return {
    matches: rows.length,
    weightedPointsPerGame:
      rows.reduce((sum, row) => sum + row.points * row.weight, 0) / safeWeight,
    strengthAdjustedPointsPerGame:
      rows.reduce((sum, row) => sum + row.points * row.strengthWeight, 0) /
      safeWeight,
    goalsFor:
      rows.reduce((sum, row) => sum + row.goalsFor * row.weight, 0) /
      safeWeight,
    goalsAgainst:
      rows.reduce((sum, row) => sum + row.goalsAgainst * row.weight, 0) /
      safeWeight,
    cleanSheetRate:
      rows.reduce(
        (sum, row) => sum + (row.goalsAgainst === 0 ? row.weight : 0),
        0,
      ) / safeWeight,
    source: "historical",
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

export function summarizeCalibration(rows: CalibrationRow[]): CalibrationSummary {
  const sampleSize = rows.length;
  const empirical = {
    home: rows.filter((row) => row.outcome === "home").length / Math.max(1, sampleSize),
    draw: rows.filter((row) => row.outcome === "draw").length / Math.max(1, sampleSize),
    away: rows.filter((row) => row.outcome === "away").length / Math.max(1, sampleSize),
  };
  const brier = average(
    rows.map((row) => brierScore(row.probabilities, row.outcome)),
  );
  const loss = average(rows.map((row) => logLoss(row.probabilities, row.outcome)));
  const rps = average(
    rows.map((row) => rankedProbabilityScore(row.probabilities, row.outcome)),
  );

  return {
    sampleSize,
    brier,
    logLoss: loss,
    rps,
    empirical,
    confidenceMultiplier: Math.min(
      1,
      Math.max(0.65, 1 - Math.max(0, brier - 0.45) * 0.35 - Math.max(0, loss - 1.05) * 0.12),
    ),
  };
}

export function adjustProbabilitiesWithCalibration(
  probabilities: HistoricalProbabilities,
  calibration?: CalibrationSummary,
): HistoricalProbabilities {
  if (!calibration || calibration.sampleSize < 30) return probabilities;
  const shrink = Math.min(0.22, Math.max(0.06, calibration.sampleSize / 1000));
  const adjusted = {
    home: probabilities.home * (1 - shrink) + calibration.empirical.home * shrink,
    draw: probabilities.draw * (1 - shrink) + calibration.empirical.draw * shrink,
    away: probabilities.away * (1 - shrink) + calibration.empirical.away * shrink,
  };
  const total = adjusted.home + adjusted.draw + adjusted.away;
  return {
    home: adjusted.home / total,
    draw: adjusted.draw / total,
    away: adjusted.away / total,
  };
}
