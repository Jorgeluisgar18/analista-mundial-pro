import { describe, expect, it } from "vitest";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { buildFeatures } from "@/lib/analysis/features";
import { demoDataset } from "@/data/demo";
import { dixonColesMatrix } from "@/lib/models/dixonColes";
import { removeOverround } from "@/lib/models/odds";
import { poissonDistribution } from "@/lib/models/poisson";

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

  it("genera mercados secundarios con los equipos reales del partido", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam = {
      ...dataset.match.homeTeam,
      name: "River Azul",
    };
    dataset.match.awayTeam = {
      ...dataset.match.awayTeam,
      name: "Estrella Norte",
    };

    const result = analyzeMatch(dataset);
    const secondaryMarkets = result.predictions.filter((prediction) =>
      ["corners", "cards", "fouls", "shots", "offsides"].includes(
        prediction.category,
      ),
    );

    expect(
      secondaryMarkets.some((prediction) =>
        /Brasil|Colombia/i.test(prediction.market),
      ),
    ).toBe(false);
    expect(
      secondaryMarkets.some((prediction) =>
        prediction.market.includes("River Azul"),
      ),
    ).toBe(true);
    expect(
      secondaryMarkets.some((prediction) =>
        prediction.market.includes("Estrella Norte"),
      ),
    ).toBe(true);
  });

  it("genera escenarios narrativos sin nombres fijos de la demo", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam = {
      ...dataset.match.homeTeam,
      name: "River Azul",
    };
    dataset.match.awayTeam = {
      ...dataset.match.awayTeam,
      name: "Estrella Norte",
    };

    const result = analyzeMatch(dataset);
    const scenarioText = result.scenarios
      .map((scenario) => `${scenario.title} ${scenario.description}`)
      .join(" ");

    expect(scenarioText).not.toMatch(/Brasil|Colombia|colombiana/i);
    expect(scenarioText).toContain("River Azul");
    expect(scenarioText).toContain("Estrella Norte");
  });

  it("adapta el resumen ejecutivo al favorito real y no siempre favorece al visitante", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam.name = "Local Dominante";
    dataset.match.awayTeam.name = "Visitante Frágil";
    dataset.home.elo = 1900;
    dataset.away.elo = 1450;
    dataset.home.recentPointsPerGame = 2.4;
    dataset.away.recentPointsPerGame = 0.8;
    dataset.home.goalsFor = 2.2;
    dataset.away.goalsFor = 0.9;
    dataset.home.goalsAgainst = 0.7;
    dataset.away.goalsAgainst = 1.9;

    const result = analyzeMatch(dataset);

    expect(result.mainProbabilities.home).toBeGreaterThan(
      result.mainProbabilities.away,
    );
    expect(result.executiveSummary).toMatch(/Local Dominante/i);
    expect(result.executiveSummary).not.toMatch(/Visitante Frágil parte con ventaja/i);
  });

  it("produce lecturas y mercados diferentes cuando cambia el contexto estadístico", () => {
    const lowTempo = structuredClone(demoDataset);
    lowTempo.match.id = "low-tempo";
    lowTempo.home.goalsFor = 0.9;
    lowTempo.away.goalsFor = 0.8;
    lowTempo.home.xgFor = 0.85;
    lowTempo.away.xgFor = 0.78;
    lowTempo.home.goalsAgainst = 0.7;
    lowTempo.away.goalsAgainst = 0.8;
    lowTempo.home.xgAgainst = 0.72;
    lowTempo.away.xgAgainst = 0.82;
    lowTempo.home.corners = 3.2;
    lowTempo.away.corners = 3.1;

    const highTempo = structuredClone(demoDataset);
    highTempo.match.id = "high-tempo";
    highTempo.home.goalsFor = 2.3;
    highTempo.away.goalsFor = 2.1;
    highTempo.home.xgFor = 2.25;
    highTempo.away.xgFor = 2.05;
    highTempo.home.goalsAgainst = 1.4;
    highTempo.away.goalsAgainst = 1.5;
    highTempo.home.xgAgainst = 1.42;
    highTempo.away.xgAgainst = 1.55;
    highTempo.home.corners = 6.8;
    highTempo.away.corners = 6.4;

    const low = analyzeMatch(lowTempo);
    const high = analyzeMatch(highTempo);
    const lowOver25 = low.predictions.find(
      (prediction) => prediction.market === "Más de 2.5 goles",
    );
    const highOver25 = high.predictions.find(
      (prediction) => prediction.market === "Más de 2.5 goles",
    );

    expect(high.expected.goals).toBeGreaterThan(low.expected.goals);
    expect(high.expected.corners).toBeGreaterThan(low.expected.corners);
    expect(highOver25?.probability).toBeGreaterThan(
      lowOver25?.probability ?? 0,
    );
    expect(high.executiveSummary).not.toBe(low.executiveSummary);
  });

  it("recalcula ventaja y valor cuando cambian las cuotas disponibles", () => {
    const shortHome = structuredClone(demoDataset);
    shortHome.odds = [
      {
        bookmaker: "Casa A",
        market: "h2h",
        outcome: shortHome.match.homeTeam.name,
        odd: 1.55,
        observedAt: "2026-06-25T18:00:00Z",
      },
      {
        bookmaker: "Casa A",
        market: "h2h",
        outcome: "Draw",
        odd: 3.4,
        observedAt: "2026-06-25T18:00:00Z",
      },
      {
        bookmaker: "Casa A",
        market: "h2h",
        outcome: shortHome.match.awayTeam.name,
        odd: 5.5,
        observedAt: "2026-06-25T18:00:00Z",
      },
    ];
    const generousHome = structuredClone(shortHome);
    generousHome.odds[0] = {
      ...generousHome.odds[0],
      odd: 3.6,
      observedAt: "2026-06-25T19:00:00Z",
    };

    const shortResult = analyzeMatch(shortHome);
    const generousResult = analyzeMatch(generousHome);
    const shortMarket = shortResult.predictions.find(
      (prediction) => prediction.market === shortHome.match.homeTeam.name,
    );
    const generousMarket = generousResult.predictions.find(
      (prediction) => prediction.market === generousHome.match.homeTeam.name,
    );

    expect(generousMarket?.availableOdd).toBeGreaterThan(
      shortMarket?.availableOdd ?? 0,
    );
    expect(generousMarket?.expectedValue ?? -100).toBeGreaterThan(
      shortMarket?.expectedValue ?? -100,
    );
    expect(generousMarket?.modelEdge).not.toBe(shortMarket?.modelEdge);
  });

  it("ajusta intensidades cuando una baja confirmada afecta a un titular ofensivo", () => {
    const base = structuredClone(demoDataset);
    const affected = structuredClone(demoDataset);
    affected.availability = [
      {
        id: "away-forward-out",
        teamId: affected.match.awayTeam.id,
        player: "Vinícius Júnior",
        type: "injured",
        impact: "Titular ofensivo descartado.",
        replacement: "Suplente",
        evidence: {
          value: "Baja confirmada",
          status: "confirmed",
          sourceType: "provider",
          source: "QA",
          observedAt: "2026-06-25T18:30:00Z",
        },
      },
    ];

    const baseResult = analyzeMatch(base);
    const affectedResult = analyzeMatch(affected);

    expect(affectedResult.expected.awayGoals).toBeLessThan(
      baseResult.expected.awayGoals,
    );
    expect(affectedResult.mainProbabilities.away).toBeLessThan(
      baseResult.mainProbabilities.away,
    );
  });

  it("orienta los escenarios al favorito y no siempre al visitante/local", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam.name = "Local Dominante";
    dataset.match.awayTeam.name = "Visitante Frágil";
    dataset.match.id = "home-favorite-scenarios";
    dataset.home.elo = 1920;
    dataset.away.elo = 1430;
    dataset.home.recentPointsPerGame = 2.5;
    dataset.away.recentPointsPerGame = 0.7;
    dataset.home.goalsFor = 2.4;
    dataset.home.xgFor = 2.35;
    dataset.home.shots = 17.5;
    dataset.away.goalsFor = 0.8;
    dataset.away.xgFor = 0.76;
    dataset.away.shots = 7.2;

    const result = analyzeMatch(dataset);
    const scenarioText = result.scenarios
      .map((scenario) => `${scenario.title} ${scenario.description}`)
      .join(" ");

    expect(result.mainProbabilities.home).toBeGreaterThan(
      result.mainProbabilities.away,
    );
    expect(result.scenarios[0].title).toContain("Local Dominante");
    expect(scenarioText).toContain("Visitante Frágil");
    expect(scenarioText).not.toContain("Visitante Frágil controla territorio");
    expect(scenarioText).not.toContain("Local Dominante protege carril central");
  });

  it("aplica calibración histórica cuando el dataset trae muestra suficiente", () => {
    const uncalibrated = structuredClone(demoDataset);
    uncalibrated.match.id = "uncalibrated-history";
    const calibrated = structuredClone(demoDataset);
    calibrated.match.id = "calibrated-history";
    calibrated.historical = {
      calibration: {
        sampleSize: 120,
        brier: 0.68,
        logLoss: 1.18,
        rps: 0.2,
        empirical: { home: 0.52, draw: 0.27, away: 0.21 },
        confidenceMultiplier: 0.9,
      },
    };

    const base = analyzeMatch(uncalibrated);
    const adjusted = analyzeMatch(calibrated);

    expect(adjusted.mainProbabilities.away).toBeLessThan(
      base.mainProbabilities.away,
    );
    expect(adjusted.calibration.sampleSize).toBe(120);
    expect(adjusted.dataQuality.note).toMatch(/calibraci/i);
  });

  it("limita la confianza cuando las estadisticas base son estimadas", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.id = "estimated-stats-confidence";
    dataset.match.dataOrigin = "API";
    dataset.lineups = dataset.lineups.map((lineup) => ({
      ...lineup,
      confirmed: true,
      formation: {
        ...lineup.formation,
        status: "confirmed",
      },
    }));
    dataset.sources = [
      {
        id: "api-team-stats",
        label: "API-Football · estadisticas de temporada",
        type: "provider",
        status: "expected",
        observedAt: "2026-06-25T18:00:00Z",
        detail: "Conteos no cubiertos usan priors explicitos.",
      },
    ];

    const result = analyzeMatch(dataset);

    expect(result.expected.confidence).toBeLessThanOrEqual(4);
    expect(result.dataQuality.note).toMatch(/estimad/i);
  });

  it("estima totales secundarios con Poisson sobre el volumen esperado", () => {
    const result = analyzeMatch(demoDataset);
    const expectedCorners = demoDataset.home.corners + demoDataset.away.corners;
    const distribution = poissonDistribution(expectedCorners, 30);
    const expectedOver85 =
      distribution.reduce(
        (total, probability, corners) =>
          corners >= 9 ? total + probability : total,
        0,
      ) * 100;
    const market = result.predictions.find(
      (prediction) => /8\.5 corners/i.test(prediction.market),
    );

    expect(market?.probability).toBeCloseTo(expectedOver85, 1);
  });
});
