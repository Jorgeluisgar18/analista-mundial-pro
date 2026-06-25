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
