import { describe, expect, it } from "vitest";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { buildFeatures } from "@/lib/analysis/features";
import { demoDataset } from "@/data/demo";
import { dixonColesMatrix } from "@/lib/models/dixonColes";
import { removeOverround } from "@/lib/models/odds";

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

  it("usa etiquetas canónicas de cuotas para empate y total de goles", () => {
    const dataset = structuredClone(demoDataset);
    dataset.odds = [
      {
        bookmaker: "Proveedor externo",
        market: "h2h",
        outcome: "Draw",
        odd: 3.2,
        observedAt: "2026-06-25T18:00:00Z",
      },
      {
        bookmaker: "Proveedor externo",
        market: "totals",
        outcome: "Over 2.5",
        odd: 1.95,
        observedAt: "2026-06-25T18:00:00Z",
      },
    ];

    const result = analyzeMatch(dataset);
    const draw = result.predictions.find(
      (prediction) => prediction.market === "Empate",
    );
    const over25 = result.predictions.find(
      (prediction) => prediction.market === "Más de 2.5 goles",
    );

    expect(draw?.availableOdd).toBe(3.2);
    expect(over25?.availableOdd).toBe(1.95);
  });

  it("elimina el margen 1X2 antes de calcular la ventaja del modelo", () => {
    const dataset = structuredClone(demoDataset);
    dataset.odds = [
      {
        bookmaker: "Casa completa",
        market: "h2h",
        outcome: dataset.match.homeTeam.name,
        odd: 3.4,
        observedAt: "2026-06-25T18:00:00Z",
      },
      {
        bookmaker: "Casa completa",
        market: "h2h",
        outcome: "Draw",
        odd: 3.25,
        observedAt: "2026-06-25T18:00:00Z",
      },
      {
        bookmaker: "Casa completa",
        market: "h2h",
        outcome: dataset.match.awayTeam.name,
        odd: 2.1,
        observedAt: "2026-06-25T18:00:00Z",
      },
    ];
    const fair = removeOverround([3.4, 3.25, 2.1]);
    const result = analyzeMatch(dataset);
    const draw = result.predictions.find(
      (prediction) => prediction.market === "Empate",
    );

    expect(Reflect.get(draw ?? {}, "marketProbability")).toBeCloseTo(
      fair[1] * 100,
      1,
    );
    expect(Reflect.get(draw ?? {}, "modelEdge")).toBeCloseTo(
      (result.mainProbabilities.draw - fair[1] * 100),
      0,
    );
  });

  it("detecta surebets 1X2 usando la mejor cuota de cada resultado", () => {
    const dataset = structuredClone(demoDataset);
    dataset.odds = [
      {
        bookmaker: "Casa A",
        market: "h2h",
        outcome: dataset.match.homeTeam.name,
        odd: 2.2,
        observedAt: "2026-06-25T18:00:00Z",
      },
      {
        bookmaker: "Casa B",
        market: "h2h",
        outcome: "Empate",
        odd: 3.6,
        observedAt: "2026-06-25T18:00:00Z",
      },
      {
        bookmaker: "Casa C",
        market: "h2h",
        outcome: dataset.match.awayTeam.name,
        odd: 4.5,
        observedAt: "2026-06-25T18:00:00Z",
      },
    ];

    const result = analyzeMatch(dataset);
    const opportunities = Reflect.get(result, "arbitrage");

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0].market).toBe("1X2");
    expect(opportunities[0].isOpportunity).toBe(true);
    expect(opportunities[0].theoreticalProfit).toBeGreaterThan(0);
  });
});
