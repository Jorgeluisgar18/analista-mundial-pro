type Outcome = "home" | "draw" | "away";
type Probabilities = Record<Outcome, number>;

export interface CalibrationBucket {
  lower: number;
  upper: number;
  predictions: number;
  averageProbability: number;
  observedRate: number;
}

export function calibrationBuckets(
  rows: Array<{ probabilities: Probabilities; outcome: Outcome }>,
  outcome: Outcome,
  bucketSize = 0.1,
): CalibrationBucket[] {
  const bucketCount = Math.ceil(1 / bucketSize);
  return Array.from({ length: bucketCount }, (_, index) => {
    const lower = index * bucketSize;
    const upper = index === bucketCount - 1 ? 1 : lower + bucketSize;
    const bucketRows = rows.filter((row) => {
      const probability = row.probabilities[outcome];
      return index === bucketCount - 1
        ? probability >= lower && probability <= upper
        : probability >= lower && probability < upper;
    });
    const predictions = bucketRows.length;
    return {
      lower,
      upper,
      predictions,
      averageProbability:
        bucketRows.reduce(
          (sum, row) => sum + row.probabilities[outcome],
          0,
        ) / Math.max(1, predictions),
      observedRate:
        bucketRows.filter((row) => row.outcome === outcome).length /
        Math.max(1, predictions),
    };
  });
}
