import { dixonColesMatrix } from "@/lib/models/dixonColes";

export const DEFAULT_DIXON_COLES_RHO = -0.08;

export const DEFAULT_DIXON_COLES_RHO_CANDIDATES = [
  -0.16,
  -0.14,
  -0.12,
  -0.1,
  -0.08,
  -0.06,
  -0.04,
  -0.02,
  0,
  0.02,
  0.04,
  0.06,
] as const;

export interface DixonColesCalibrationRow {
  homeGoals: number;
  awayGoals: number;
  homeLambda: number;
  awayLambda: number;
  weight?: number;
}

export interface DixonColesRhoCandidateScore {
  rho: number;
  averageLogLoss: number;
}

export interface DixonColesRhoCalibration {
  rho: number;
  applied: boolean;
  sampleSize: number;
  averageLogLoss: number | null;
  candidates: DixonColesRhoCandidateScore[];
}

interface DixonColesRhoCalibrationOptions {
  candidates?: readonly number[];
  minSampleSize?: number;
  maxGoals?: number;
}

function isValidRow(row: DixonColesCalibrationRow) {
  return (
    Number.isFinite(row.homeGoals) &&
    Number.isFinite(row.awayGoals) &&
    Number.isInteger(row.homeGoals) &&
    Number.isInteger(row.awayGoals) &&
    row.homeGoals >= 0 &&
    row.awayGoals >= 0 &&
    Number.isFinite(row.homeLambda) &&
    Number.isFinite(row.awayLambda) &&
    row.homeLambda > 0 &&
    row.awayLambda > 0
  );
}

function scoreProbability(row: DixonColesCalibrationRow, rho: number, maxGoals: number) {
  const matrixMaxGoals = Math.max(maxGoals, row.homeGoals, row.awayGoals);
  const matrix = dixonColesMatrix(
    row.homeLambda,
    row.awayLambda,
    rho,
    matrixMaxGoals,
  ).matrix;
  return Math.max(1e-12, matrix[row.homeGoals]?.[row.awayGoals] ?? 1e-12);
}

function weightedAverageLogLoss(
  rows: DixonColesCalibrationRow[],
  rho: number,
  maxGoals: number,
) {
  const weightTotal = rows.reduce((total, row) => total + (row.weight ?? 1), 0);
  return (
    rows.reduce(
      (total, row) =>
        total -
        Math.log(scoreProbability(row, rho, maxGoals)) * (row.weight ?? 1),
      0,
    ) / Math.max(0.0001, weightTotal)
  );
}

export function calibrateDixonColesRho(
  rows: DixonColesCalibrationRow[],
  options: DixonColesRhoCalibrationOptions = {},
): DixonColesRhoCalibration {
  const candidates = [
    ...(options.candidates ?? DEFAULT_DIXON_COLES_RHO_CANDIDATES),
  ];
  const validRows = rows.filter(isValidRow);
  const sampleSize = validRows.length;
  const minSampleSize = options.minSampleSize ?? 30;
  const maxGoals = options.maxGoals ?? 8;

  if (sampleSize < minSampleSize || !candidates.length) {
    return {
      rho: DEFAULT_DIXON_COLES_RHO,
      applied: false,
      sampleSize,
      averageLogLoss: null,
      candidates: [],
    };
  }

  const scores = candidates
    .map((rho) => ({
      rho,
      averageLogLoss: weightedAverageLogLoss(validRows, rho, maxGoals),
    }))
    .sort((left, right) => left.averageLogLoss - right.averageLogLoss);

  return {
    rho: scores[0]?.rho ?? DEFAULT_DIXON_COLES_RHO,
    applied: true,
    sampleSize,
    averageLogLoss: scores[0]?.averageLogLoss ?? null,
    candidates: scores,
  };
}
