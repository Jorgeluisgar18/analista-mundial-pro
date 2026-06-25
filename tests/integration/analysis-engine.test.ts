import { describe, expect, it } from "vitest";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { demoDataset } from "@/data/demo";

describe("analysisEngine", () => {
  it("genera probabilidades normalizadas y mercados trazables", () => {
    const result = analyzeMatch(demoDataset);
    expect(
      result.mainProbabilities.home +
        result.mainProbabilities.draw +
        result.mainProbabilities.away,
    ).toBeCloseTo(100, 1);
    expect(result.predictions.length).toBeGreaterThan(20);
    expect(
      result.predictions.every(
        (market) => market.reason && market.risk && market.sourceIds.length,
      ),
    ).toBe(true);
  });

  it("no inventa métricas de jugadores ausentes", () => {
    const result = analyzeMatch({ ...demoDataset, players: [] });
    const playerMarkets = result.predictions.filter(
      (prediction) => prediction.category === "players",
    );
    expect(
      playerMarkets.every(
        (prediction) => prediction.evidenceStatus === "unavailable",
      ),
    ).toBe(true);
  });
});
