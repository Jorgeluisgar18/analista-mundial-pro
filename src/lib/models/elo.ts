export function eloExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function updateElo(
  ratingA: number,
  ratingB: number,
  scoreA: 0 | 0.5 | 1,
  k = 24,
) {
  const expectedA = eloExpected(ratingA, ratingB);
  const nextA = ratingA + k * (scoreA - expectedA);
  return {
    ratingA: nextA,
    ratingB: ratingB - (nextA - ratingA),
  };
}
