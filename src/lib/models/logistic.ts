export function logisticProbability(
  features: number[],
  coefficients: number[],
  intercept = 0,
) {
  if (features.length !== coefficients.length) {
    throw new Error("Features and coefficients must have the same length");
  }
  const score =
    intercept +
    features.reduce(
      (sum, feature, index) => sum + feature * coefficients[index],
      0,
    );
  return 1 / (1 + Math.exp(-score));
}
