import { describe, expect, it } from "vitest";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { demoDataset } from "@/data/demo";

describe("probabilistic ensemble", () => {
  it("combina métodos y conserva una distribución 1X2 válida", () => {
    const result = analyzeMatch(demoDataset);
    const total =
      result.mainProbabilities.home +
      result.mainProbabilities.draw +
      result.mainProbabilities.away;
    expect(total).toBeCloseTo(100, 1);
    expect(result.modelVersion).toContain("ensemble");
  });
});
