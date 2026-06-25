export function impliedProbability(decimalOdd: number): number {
  if (decimalOdd <= 1) throw new Error("La cuota decimal debe ser mayor que 1");
  return 1 / decimalOdd;
}

export function normalizeOddOutcome(outcome: string): string {
  const trimmed = outcome.trim();
  if (/^draw$/i.test(trimmed)) return "Empate";

  const total = trimmed.match(
    /^(over|under|más de|menos de)\s+(\d+(?:\.\d+)?)$/i,
  );
  if (!total) return trimmed;

  const [, direction, line] = total;
  return /^(over|más de)$/i.test(direction)
    ? `Más de ${line}`
    : `Menos de ${line}`;
}

export function removeOverround(decimalOdds: number[]): number[] {
  const implied = decimalOdds.map(impliedProbability);
  const total = implied.reduce((sum, value) => sum + value, 0);
  return implied.map((value) => value / total);
}

export function expectedValue(probability: number, decimalOdd: number): number {
  return probability * decimalOdd - 1;
}

export function minimumValueOdd(probability: number, edge = 0.03): number {
  return (1 + edge) / probability;
}

export function detectArbitrage(decimalOdds: number[], bankroll = 100) {
  const inverseSum = decimalOdds
    .map(impliedProbability)
    .reduce((sum, value) => sum + value, 0);
  const stakes = decimalOdds.map(
    (odd) => (bankroll * (1 / odd)) / inverseSum,
  );
  const returnAmount = stakes[0] * decimalOdds[0];
  return {
    isOpportunity: inverseSum < 1,
    inverseSum,
    margin: 1 - inverseSum,
    stakes,
    returnAmount,
    theoreticalProfit: returnAmount - bankroll,
  };
}
