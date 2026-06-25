import { describe, expect, it } from "vitest";
import {
  poissonDistribution,
  scoreMatrix,
} from "@/lib/models/poisson";

describe("Poisson", () => {
  it("produce una distribución que suma aproximadamente uno", () => {
    const distribution = poissonDistribution(1.6, 12);
    expect(distribution.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
      6,
    );
  });

  it("deriva 1X2 desde una matriz de marcadores", () => {
    const result = scoreMatrix(1.1, 1.6, 9);
    expect(result.home + result.draw + result.away).toBeCloseTo(1, 6);
    expect(result.away).toBeGreaterThan(result.home);
  });
});
