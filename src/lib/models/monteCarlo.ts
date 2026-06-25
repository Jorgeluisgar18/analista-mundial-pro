function mulberry32(seed: number) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function samplePoisson(lambda: number, random: () => number) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= random();
  } while (product > limit);
  return count - 1;
}

export function simulateGoals({
  homeLambda,
  awayLambda,
  iterations = 10_000,
  seed = 2026,
}: {
  homeLambda: number;
  awayLambda: number;
  iterations?: number;
  seed?: number;
}) {
  const random = mulberry32(seed);
  const totals: number[] = [];
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  for (let index = 0; index < iterations; index += 1) {
    const home = samplePoisson(homeLambda, random);
    const away = samplePoisson(awayLambda, random);
    totals.push(home + away);
    if (home > away) homeWins += 1;
    else if (home === away) draws += 1;
    else awayWins += 1;
  }
  totals.sort((a, b) => a - b);
  return {
    home: homeWins / iterations,
    draw: draws / iterations,
    away: awayWins / iterations,
    meanGoals: totals.reduce((sum, value) => sum + value, 0) / iterations,
    interval: [
      totals[Math.floor(iterations * 0.1)],
      totals[Math.floor(iterations * 0.9)],
    ] as [number, number],
  };
}
