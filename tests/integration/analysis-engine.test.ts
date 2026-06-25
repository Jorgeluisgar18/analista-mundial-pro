import { describe, expect, it } from "vitest";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { buildFeatures } from "@/lib/analysis/features";
import { demoDataset } from "@/data/demo";
import { dixonColesMatrix } from "@/lib/models/dixonColes";

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

  it("deriva el mercado visitante más de 1.5 desde toda la matriz", () => {
    const result = analyzeMatch(demoDataset);
    const features = buildFeatures(demoDataset);
    const matrix = dixonColesMatrix(
      features.homeLambda,
      features.awayLambda,
      -0.08,
      8,
    ).matrix;
    const expectedProbability =
      matrix.reduce(
        (total, row) =>
          total +
          row.reduce(
            (rowTotal, probability, awayGoals) =>
              awayGoals >= 2 ? rowTotal + probability : rowTotal,
            0,
          ),
        0,
      ) * 100;
    const market = result.predictions.find(
      (prediction) =>
        prediction.market ===
        `${demoDataset.match.awayTeam.name} más de 1.5 goles`,
    );

    expect(market?.probability).toBeCloseTo(expectedProbability, 1);
  });
});
