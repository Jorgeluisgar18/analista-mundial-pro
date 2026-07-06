type Outcome = "home" | "draw" | "away";
type Probabilities = Record<Outcome, number>;
const OUTCOMES: Outcome[] = ["home", "draw", "away"];

export function brierScore(probabilities: Probabilities, outcome: Outcome) {
  return OUTCOMES.reduce((sum, key) => {
    const observed = key === outcome ? 1 : 0;
    return sum + (probabilities[key] - observed) ** 2;
  }, 0);
}

export function logLoss(probabilities: Probabilities, outcome: Outcome) {
  const clipped = Math.min(1 - 1e-8, Math.max(1e-8, probabilities[outcome]));
  return -Math.log(clipped);
}

export function rankedProbabilityScore(
  probabilities: Probabilities,
  outcome: Outcome,
) {
  return OUTCOMES.slice(0, -1).reduce((sum, _key, index) => {
    const predictedCumulative = OUTCOMES.slice(0, index + 1).reduce(
      (total, key) => total + probabilities[key],
      0,
    );
    const observedCumulative = OUTCOMES.slice(0, index + 1).includes(outcome)
      ? 1
      : 0;
    return sum + (predictedCumulative - observedCumulative) ** 2;
  }, 0) / (OUTCOMES.length - 1);
}
