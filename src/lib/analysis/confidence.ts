export interface ConfidenceInput {
  coverage: number;
  freshness: number;
  agreement: number;
  modelStability: number;
  calibration: number;
  lineupConfirmed: boolean;
  hasBaseStats: boolean;
}

export function calculateConfidence(input: ConfidenceInput): number {
  const weighted =
    input.coverage * 0.25 +
    input.freshness * 0.2 +
    input.agreement * 0.2 +
    input.modelStability * 0.2 +
    input.calibration * 0.15;
  let confidence = Math.round(weighted * 100) / 10;
  if (!input.lineupConfirmed) confidence = Math.min(confidence, 6);
  if (!input.hasBaseStats) confidence = Math.min(confidence, 4);
  return Math.max(1, Math.min(10, confidence));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export interface ModelStabilityInput {
  sampleSize: number;
  brier: number;
  logLoss: number;
  rps: number;
}

export function calculateModelStability(
  calibration?: ModelStabilityInput,
): number {
  if (!calibration) return 0.68;

  const brierQuality = clamp(1 - (calibration.brier - 0.32) / 0.55, 0.25, 1);
  const logLossQuality = clamp(
    1 - (calibration.logLoss - 0.75) / 0.95,
    0.25,
    1,
  );
  const rpsQuality = clamp(1 - (calibration.rps - 0.1) / 0.45, 0.25, 1);
  const metricQuality =
    brierQuality * 0.42 + logLossQuality * 0.36 + rpsQuality * 0.22;
  const sampleConfidence = clamp(
    Math.log10(Math.max(1, calibration.sampleSize)) / 2.3,
    0.35,
    1,
  );

  return clamp(metricQuality * 0.75 + sampleConfidence * 0.25, 0.35, 0.96);
}
