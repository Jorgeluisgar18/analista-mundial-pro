import { calculateConfidence } from "@/lib/analysis/confidence";
import { buildFeatures } from "@/lib/analysis/features";
import { dixonColesMatrix } from "@/lib/models/dixonColes";
import { logisticProbability } from "@/lib/models/logistic";
import { simulateGoals } from "@/lib/models/monteCarlo";
import {
  expectedValue,
  minimumValueOdd,
} from "@/lib/models/odds";
import type {
  AnalysisResult,
  EvidenceStatus,
  MatchDataset,
  Prediction,
  RiskLevel,
  ValueTier,
} from "@/types/domain";

const pct = (value: number) => Math.round(value * 1000) / 10;
const clamp = (value: number, min = 0.05, max = 0.95) =>
  Math.min(max, Math.max(min, value));

function riskFor(probability: number): RiskLevel {
  if (probability >= 0.7) return "Bajo";
  if (probability >= 0.52) return "Medio";
  return "Alto";
}

function tierFor(probability: number, ev?: number): ValueTier {
  if (ev !== undefined && ev >= 0.08 && probability >= 0.62)
    return "Conservador";
  if (ev !== undefined && ev >= 0.04) return "Moderado";
  if (ev !== undefined && ev > 0) return "Arriesgado";
  return "Solo observación";
}

function makePrediction({
  id,
  category,
  market,
  probability,
  confidence,
  reason,
  risk,
  sourceIds,
  evidenceStatus = "inferred",
  line,
  availableOdd,
}: {
  id: string;
  category: Prediction["category"];
  market: string;
  probability?: number;
  confidence: number;
  reason: string;
  risk: string;
  sourceIds: string[];
  evidenceStatus?: EvidenceStatus;
  line?: string;
  availableOdd?: number;
}): Prediction {
  if (probability === undefined) {
    return {
      id,
      category,
      market,
      line,
      confidence: 1,
      riskLevel: "Observación",
      risk,
      reason,
      valueTier: "Solo observación",
      evidenceStatus: "unavailable",
      sourceIds,
    };
  }
  const minimumOdd = minimumValueOdd(probability);
  const ev =
    availableOdd !== undefined
      ? expectedValue(probability, availableOdd)
      : undefined;
  return {
    id,
    category,
    market,
    line,
    probability: pct(probability),
    interval: [pct(clamp(probability - 0.06)), pct(clamp(probability + 0.06))],
    confidence,
    riskLevel: riskFor(probability),
    risk,
    reason,
    minimumOddForValue: Math.round(minimumOdd * 100) / 100,
    availableOdd,
    expectedValue: ev === undefined ? undefined : Math.round(ev * 1000) / 10,
    valueTier: tierFor(probability, ev),
    evidenceStatus,
    sourceIds,
  };
}

function topScores(matrix: number[][]) {
  return matrix
    .flatMap((row, home) =>
      row.map((probability, away) => ({ home, away, probability })),
    )
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
}

export function analyzeMatch(
  dataset: MatchDataset,
  options: { manuallyUpdated?: boolean } = {},
): AnalysisResult {
  const features = buildFeatures(dataset);
  const model = dixonColesMatrix(
    features.homeLambda,
    features.awayLambda,
    -0.08,
    8,
  );
  const formDelta =
    dataset.home.recentPointsPerGame - dataset.away.recentPointsPerGame;
  const attackDelta =
    (dataset.home.xgFor ?? dataset.home.goalsFor) -
    (dataset.away.xgFor ?? dataset.away.goalsFor);
  const defenceDelta =
    (dataset.away.xgAgainst ?? dataset.away.goalsAgainst) -
    (dataset.home.xgAgainst ?? dataset.home.goalsAgainst);
  const eloDelta = (dataset.home.elo - dataset.away.elo) / 400;
  const homeStrength = logisticProbability(
    [eloDelta, formDelta, attackDelta, defenceDelta],
    [1.35, 0.62, 0.48, 0.4],
    -0.08,
  );
  const awayStrength = logisticProbability(
    [-eloDelta, -formDelta, -attackDelta, -defenceDelta],
    [1.35, 0.62, 0.48, 0.4],
    -0.08,
  );
  const logisticDraw = clamp(
    0.33 - Math.abs(homeStrength - awayStrength) * 0.18,
    0.16,
    0.33,
  );
  const logisticTotal = homeStrength + awayStrength;
  const logisticHome = (homeStrength / logisticTotal) * (1 - logisticDraw);
  const logisticAway = (awayStrength / logisticTotal) * (1 - logisticDraw);
  const simulation = simulateGoals({
    homeLambda: features.homeLambda,
    awayLambda: features.awayLambda,
    iterations: 12_000,
    seed: 20260615,
  });
  const blended = {
    home: model.home * 0.6 + simulation.home * 0.2 + logisticHome * 0.2,
    draw: model.draw * 0.6 + simulation.draw * 0.2 + logisticDraw * 0.2,
    away: model.away * 0.6 + simulation.away * 0.2 + logisticAway * 0.2,
  };
  const blendedTotal = blended.home + blended.draw + blended.away;
  blended.home /= blendedTotal;
  blended.draw /= blendedTotal;
  blended.away /= blendedTotal;
  const lineupsConfirmed =
    dataset.lineups.length > 0 &&
    dataset.lineups.every((lineup) => lineup.confirmed);
  const confidence = calculateConfidence({
    coverage: dataset.players.length ? 0.88 : 0.7,
    freshness: 0.87,
    agreement: dataset.sources.some((source) => source.status === "conflict")
      ? 0.55
      : 0.86,
    modelStability: 0.82,
    calibration: 0.78,
    lineupConfirmed: lineupsConfirmed,
    hasBaseStats: Boolean(dataset.home.shots && dataset.away.shots),
  });
  const sourceIds = dataset.sources.map((source) => source.id);
  const homeOdd = dataset.odds.find((odd) => odd.outcome === dataset.match.homeTeam.name)?.odd;
  const drawOdd = dataset.odds.find((odd) => odd.outcome === "Empate")?.odd;
  const awayOdd = dataset.odds.find((odd) => odd.outcome === dataset.match.awayTeam.name)?.odd;
  const over25Odd = dataset.odds.find((odd) => odd.outcome === "Más de 2.5")?.odd;
  const predictions: Prediction[] = [];

  [
    [dataset.match.homeTeam.name, blended.home, homeOdd],
    ["Empate", blended.draw, drawOdd],
    [dataset.match.awayTeam.name, blended.away, awayOdd],
    [`${dataset.match.homeTeam.name} o empate`, blended.home + blended.draw, undefined],
    [`${dataset.match.awayTeam.name} o empate`, blended.away + blended.draw, undefined],
  ].forEach(([market, probability, odd], index) => {
    predictions.push(
      makePrediction({
        id: `result-${index}`,
        category: "result",
        market: String(market),
        probability: Number(probability),
        confidence,
        availableOdd: typeof odd === "number" ? odd : undefined,
        reason:
          "Combina fuerza Elo, intensidades de gol y contexto de sede neutral.",
        risk: "La alineación oficial puede cambiar el balance de fuerza.",
        sourceIds,
      }),
    );
  });

  topScores(model.matrix).forEach((score, index) => {
    predictions.push(
      makePrediction({
        id: `score-${index}`,
        category: "score",
        market: `${score.home}–${score.away}`,
        probability: score.probability,
        confidence: Math.max(1, confidence - 1.4),
        reason: "Celda de mayor masa en la matriz Dixon–Coles.",
        risk: "Los marcadores exactos concentran alta varianza.",
        sourceIds,
      }),
    );
  });

  const goals = [
    ["Más de 1.5 goles", 1 - model.matrix.flatMap((row, h) => row.filter((_, a) => h + a <= 1)).reduce((a, b) => a + b, 0), undefined],
    ["Menos de 3.5 goles", model.under35, undefined],
    ["Más de 2.5 goles", model.over25, over25Odd],
    ["Ambos equipos marcan", model.bothTeamsScore, undefined],
    [
      `${dataset.match.awayTeam.name} más de 1.5 goles`,
      model.matrix.reduce(
        (total, row) =>
          total +
          row.reduce(
            (rowTotal, probability, awayGoals) =>
              awayGoals >= 2 ? rowTotal + probability : rowTotal,
            0,
          ),
        0,
      ),
      undefined,
    ],
  ] as const;
  goals.forEach(([market, probability, odd], index) =>
    predictions.push(
      makePrediction({
        id: `goals-${index}`,
        category: "goals",
        market,
        probability: clamp(probability),
        confidence,
        availableOdd: odd,
        reason:
          "Se deriva de la distribución conjunta de goles ajustada por marcadores bajos.",
        risk: "Un gol temprano o una expulsión altera el ritmo esperado.",
        sourceIds,
      }),
    ),
  );

  const countMarkets: Array<{
    category: Prediction["category"];
    base: number;
    labels: string[];
    reason: string;
  }> = [
    {
      category: "corners",
      base: features.expectedCorners,
      labels: [
        "Más de 7.5 corners",
        "Más de 8.5 corners",
        "Brasil más corners",
        "Colombia más de 3.5 corners",
        "Más de 3.5 corners 1T",
      ],
      reason: "Volumen de ataques, amplitud y producción reciente de corners.",
    },
    {
      category: "cards",
      base: features.expectedCards,
      labels: [
        "Más de 3.5 tarjetas",
        "Más de 4.5 tarjetas",
        "Colombia más de 1.5 tarjetas",
        "Brasil más de 1.5 tarjetas",
        "Posible tarjeta roja",
      ],
      reason: "Disciplina reciente, presión competitiva y perfil arbitral disponible.",
    },
    {
      category: "fouls",
      base: features.expectedFouls,
      labels: [
        "Más de 21.5 faltas",
        "Colombia más de 10.5 faltas",
        "Brasil más de 9.5 faltas",
        "Colombia más faltas recibidas",
        "Más faltas en 2T",
      ],
      reason: "Frecuencia histórica de duelos, presión y transición.",
    },
    {
      category: "shots",
      base: features.expectedShots,
      labels: [
        "Brasil más de 12.5 disparos",
        "Colombia más de 8.5 disparos",
        "Más de 23.5 disparos",
        "Brasil más de 4.5 tiros a puerta",
        "Colombia más de 2.5 tiros a puerta",
      ],
      reason: "Producción reciente de remates y control territorial esperado.",
    },
    {
      category: "offsides",
      base: features.expectedOffsides,
      labels: [
        "Más de 2.5 fueras de juego",
        "Brasil más de 1.5 fueras de juego",
        "Colombia más de 0.5 fueras de juego",
      ],
      reason: "Altura defensiva y frecuencia de ataques al espacio.",
    },
  ];

  countMarkets.forEach((group) => {
    group.labels.forEach((market, index) => {
      const center =
        group.category === "cards"
          ? group.base / 6
          : group.category === "offsides"
            ? group.base / 5
            : group.base / 14;
      const probability = clamp(0.48 + center * 0.18 - index * 0.055);
      predictions.push(
        makePrediction({
          id: `${group.category}-${index}`,
          category: group.category,
          market,
          probability,
          confidence: Math.max(1, confidence - 0.7),
          reason: group.reason,
          risk:
            group.category === "cards"
              ? "Sin árbitro confirmado la incertidumbre disciplinaria aumenta."
              : "El guion de partido puede cambiar el volumen del conteo.",
          sourceIds,
        }),
      );
    });
  });

  if (dataset.players.length) {
    const playerRows = [...dataset.players]
      .sort(
        (a, b) =>
          (b.goalProbability ?? 0) + (b.assistProbability ?? 0) -
          ((a.goalProbability ?? 0) + (a.assistProbability ?? 0)),
      )
      .slice(0, 5);
    playerRows.forEach((player, index) => {
      predictions.push(
        makePrediction({
          id: `player-${index}`,
          category: "players",
          market: `${player.name}: 1+ tiro a puerta`,
          probability: clamp((player.shotsOnTarget ?? 0) / 2.3),
          confidence: Math.max(1, confidence - 1),
          reason: `${player.shotsOnTarget ?? 0} tiros a puerta proyectados y rol ${player.position}.`,
          risk: "El mercado depende de titularidad y minutos efectivos.",
          sourceIds,
          evidenceStatus: player.starterStatus,
        }),
      );
    });
  } else {
    Array.from({ length: 5 }, (_, index) =>
      predictions.push(
        makePrediction({
          id: `player-unavailable-${index}`,
          category: "players",
          market: "Dato de jugador no disponible",
          confidence: 1,
          reason: "Dato no disponible en la fuente actual.",
          risk: "No se calcula sin historial individual y titularidad.",
          sourceIds,
        }),
      ),
    );
  }

  const home = pct(blended.home);
  const draw = pct(blended.draw);
  const away = Math.round((100 - home - draw) * 10) / 10;
  const totalGoals = features.homeLambda + features.awayLambda;

  return {
    id: `analysis-${dataset.match.id}`,
    modelVersion: "AMP ensemble 1.0.0",
    generatedAt: new Date().toISOString(),
    manuallyUpdated: Boolean(options.manuallyUpdated),
    match: dataset.match,
    executiveSummary: `${dataset.match.awayTeam.name} parte con ventaja por fuerza relativa y producción ofensiva, pero ${dataset.match.homeTeam.name} puede reducir la diferencia con un bloque medio compacto. El rango central del modelo se concentra alrededor de ${totalGoals.toFixed(1)} goles.`,
    mainProbabilities: { home, draw, away },
    expected: {
      goals: Math.round(totalGoals * 100) / 100,
      homeGoals: Math.round(features.homeLambda * 100) / 100,
      awayGoals: Math.round(features.awayLambda * 100) / 100,
      corners: Math.round(features.expectedCorners * 10) / 10,
      cards: Math.round(features.expectedCards * 10) / 10,
      confidence,
    },
    predictions,
    scenarios: [
      {
        title: "Brasil controla territorio",
        probability: away,
        description:
          "Amplitud alta, presión tras pérdida y mayor volumen de remate.",
      },
      {
        title: "Partido bloqueado",
        probability: draw,
        description:
          "Colombia protege carril central y reduce ocasiones claras.",
      },
      {
        title: "Transición colombiana",
        probability: Math.min(home, 24),
        description:
          "Recuperación media y ataque rápido sobre el lateral adelantado.",
      },
    ],
    alerts: [
      {
        level: lineupsConfirmed ? "info" : "warning",
        title: lineupsConfirmed
          ? "Alineaciones confirmadas"
          : "Alineaciones por confirmar",
        detail: lineupsConfirmed
          ? "El modelo incorpora los once oficiales."
          : "Recalcular aproximadamente una hora antes del partido.",
      },
      {
        level: dataset.referee.status === "unavailable" ? "warning" : "info",
        title: "Árbitro",
        detail:
          dataset.referee.status === "unavailable"
            ? "Dato no disponible en la fuente actual."
            : String(dataset.referee.value),
      },
    ],
    sources: dataset.sources,
    dataQuality: {
      coverage: dataset.players.length ? 88 : 70,
      freshness: 87,
      agreement: 86,
      lineupConfirmed: lineupsConfirmed,
      note:
        dataset.match.dataOrigin === "DEMO"
          ? "Datos demostrativos: no representan información actual."
          : "Snapshot reproducible de fuentes consultadas.",
    },
  };
}
