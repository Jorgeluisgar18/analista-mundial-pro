type Outcome = "home" | "draw" | "away";
type Probabilities = Record<Outcome, number>;

export function brierScore(probabilities: Probabilities, outcome: Outcome) {
  return (["home", "draw", "away"] as Outcome[]).reduce((sum, key) => {
    const observed = key === outcome ? 1 : 0;
    return sum + (probabilities[key] - observed) ** 2;
  }, 0);
}

export function logLoss(probabilities: Probabilities, outcome: Outcome) {
  const clipped = Math.min(1 - 1e-8, Math.max(1e-8, probabilities[outcome]));
  return -Math.log(clipped);
}
