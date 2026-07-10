import {
  calculateConfidence,
  calculateModelStability,
} from "@/lib/analysis/confidence";
import { buildFeatures } from "@/lib/analysis/features";
import { DEFAULT_DIXON_COLES_RHO } from "@/lib/backtesting/dixon-coles-calibration";
import { dixonColesMatrix } from "@/lib/models/dixonColes";
import { logisticProbability } from "@/lib/models/logistic";
import { simulateGoals } from "@/lib/models/monteCarlo";
import {
  detectArbitrage,
  expectedValue,
  minimumValueOdd,
  normalizeOddOutcome,
  removeOverround,
} from "@/lib/models/odds";
import { poissonDistribution } from "@/lib/models/poisson";
import { adjustProbabilitiesWithCalibration } from "@/lib/historical/form";
import type {
  AnalysisResult,
  ArbitrageOpportunity,
  EvidenceStatus,
  MatchDataset,
  Prediction,
  RiskLevel,
  SourceRecord,
  ValueTier,
} from "@/types/domain";

const pct = (value: number) => Math.round(value * 1000) / 10;
const clamp = (value: number, min = 0.05, max = 0.95) =>
  Math.min(max, Math.max(min, value));

function deterministicSeed(value: string) {
  return [...value].reduce(
    (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
    2_026_061_5,
  );
}

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

function isFinitePositive(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isBaseStatsSource(source: SourceRecord) {
  const haystack = `${source.id} ${source.label} ${source.detail}`.toLowerCase();
  return (
    haystack.includes("team-stats") ||
    haystack.includes("stats") ||
    haystack.includes("estad") ||
    haystack.includes("hist") ||
    haystack.includes("form")
  );
}

function hasReliableBaseStats(dataset: MatchDataset) {
  const numericStatsPresent = [
    dataset.home.goalsFor,
    dataset.home.goalsAgainst,
    dataset.home.shots,
    dataset.home.shotsOnTarget,
    dataset.away.goalsFor,
    dataset.away.goalsAgainst,
    dataset.away.shots,
    dataset.away.shotsOnTarget,
  ].every(isFinitePositive);

  if (!numericStatsPresent) return false;

  return dataset.sources.some(
    (source) =>
      isBaseStatsSource(source) &&
      (source.status === "confirmed" || source.status === "inferred"),
  );
}

function sourceFreshnessScore(sources: SourceRecord[], now = new Date()) {
  const latestObservedAt = sources
    .map((source) => new Date(source.observedAt).getTime())
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((a, b) => b - a)[0];

  if (latestObservedAt === undefined) return 0.5;

  const ageHours = Math.max(
    0,
    (now.getTime() - latestObservedAt) / (1000 * 60 * 60),
  );

  if (ageHours <= 1) return 0.95;
  if (ageHours <= 6) return 0.9;
  if (ageHours <= 24) return 0.82;
  if (ageHours <= 72) return 0.65;
  if (ageHours <= 168) return 0.45;
  return 0.3;
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
  marketProbability,
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
  marketProbability?: number;
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
    marketProbability:
      marketProbability === undefined ? undefined : pct(marketProbability),
    modelEdge:
      marketProbability === undefined
        ? undefined
        : pct(probability - marketProbability),
    valueTier: tierFor(probability, ev),
    evidenceStatus,
    sourceIds,
  };
}

function isH2HMarket(market: string) {
  return ["h2h", "1x2"].includes(market.toLowerCase());
}

function isTotalsMarket(market: string) {
  return ["totals", "goles"].includes(market.toLowerCase());
}

function bestOddFor(
  odds: MatchDataset["odds"],
  outcome: string,
  market: "h2h" | "totals",
) {
  return odds
    .filter(
      (odd) =>
        odd.outcome === outcome &&
        (market === "h2h"
          ? isH2HMarket(odd.market)
          : isTotalsMarket(odd.market)),
    )
    .sort((a, b) => b.odd - a.odd)[0];
}

function fairH2HProbabilities(
  odds: MatchDataset["odds"],
  outcomes: [string, string, string],
) {
  const bookmakerNames = [...new Set(odds.map((odd) => odd.bookmaker))];
  const completeBooks = bookmakerNames
    .map((bookmaker) => {
      const bookOdds = odds.filter(
        (odd) => odd.bookmaker === bookmaker && isH2HMarket(odd.market),
      );
      const prices = outcomes.map(
        (outcome) => bookOdds.find((odd) => odd.outcome === outcome)?.odd,
      );
      const observedAt = bookOdds.reduce(
        (latest, odd) =>
          odd.observedAt > latest ? odd.observedAt : latest,
        "",
      );
      return prices.every((price): price is number => price !== undefined)
        ? { prices, observedAt }
        : null;
    })
    .filter(
      (
        book,
      ): book is {
        prices: [number, number, number];
        observedAt: string;
      } => book !== null,
    )
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));

  return completeBooks.length
    ? removeOverround(completeBooks[0].prices)
    : undefined;
}

function findArbitrage(
  odds: MatchDataset["odds"],
  match: MatchDataset["match"],
): ArbitrageOpportunity[] {
  const outcomes = [
    match.homeTeam.name,
    "Empate",
    match.awayTeam.name,
  ] as const;
  const best = outcomes.map((outcome) => bestOddFor(odds, outcome, "h2h"));
  if (best.some((odd) => odd === undefined)) return [];

  const complete = best as [
    NonNullable<(typeof best)[number]>,
    NonNullable<(typeof best)[number]>,
    NonNullable<(typeof best)[number]>,
  ];
  const bankroll = 100;
  const calculation = detectArbitrage(
    complete.map((odd) => odd.odd),
    bankroll,
  );
  if (!calculation.isOpportunity) return [];

  return [
    {
      id: "arbitrage-1x2",
      market: "1X2",
      isOpportunity: true,
      inverseSum: calculation.inverseSum,
      margin: calculation.margin,
      returnAmount: calculation.returnAmount,
      theoreticalProfit: calculation.theoreticalProfit,
      bankroll,
      outcomes: complete.map((odd, index) => ({
        outcome: outcomes[index],
        bookmaker: odd.bookmaker,
        odd: odd.odd,
        stake: calculation.stakes[index],
      })),
    },
  ];
}

function topScores(matrix: number[][]) {
  return matrix
    .flatMap((row, home) =>
      row.map((probability, away) => ({ home, away, probability })),
    )
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
}

function strongestSide({
  home,
  draw,
  away,
  homeTeam,
  awayTeam,
}: {
  home: number;
  draw: number;
  away: number;
  homeTeam: string;
  awayTeam: string;
}) {
  const max = Math.max(home, draw, away);
  if (max === draw || Math.abs(home - away) < 0.025) {
    return {
      team: undefined,
      label: "partido equilibrado",
      probability: draw,
      isBalanced: true,
    };
  }
  return home > away
    ? {
        team: homeTeam,
        label: homeTeam,
        probability: home,
        isBalanced: false,
      }
    : {
        team: awayTeam,
        label: awayTeam,
        probability: away,
        isBalanced: false,
      };
}

function buildExecutiveSummary(
  dataset: MatchDataset,
  probabilities: { home: number; draw: number; away: number },
  totalGoals: number,
) {
  const side = strongestSide({
    ...probabilities,
    homeTeam: dataset.match.homeTeam.name,
    awayTeam: dataset.match.awayTeam.name,
  });
  const homeVolume =
    (dataset.home.xgFor ?? dataset.home.goalsFor) + dataset.home.shots / 12;
  const awayVolume =
    (dataset.away.xgFor ?? dataset.away.goalsFor) + dataset.away.shots / 12;
  const volumeLeader =
    Math.abs(homeVolume - awayVolume) < 0.18
      ? "ningún equipo separa claramente el volumen ofensivo"
      : homeVolume > awayVolume
        ? `${dataset.match.homeTeam.name} aporta mayor volumen ofensivo`
        : `${dataset.match.awayTeam.name} aporta mayor volumen ofensivo`;
  const lineupNote = dataset.lineups.every((lineup) => lineup.confirmed)
    ? "con alineaciones confirmadas"
    : "con sensibilidad alta a la confirmación de alineaciones";

  if (side.isBalanced) {
    return `El modelo proyecta un partido equilibrado entre ${dataset.match.homeTeam.name} y ${dataset.match.awayTeam.name}: ${volumeLeader}, pero la distribución 1X2 no abre una brecha fuerte. El rango central se concentra alrededor de ${totalGoals.toFixed(1)} goles, ${lineupNote}.`;
  }

  const opponent =
    side.team === dataset.match.homeTeam.name
      ? dataset.match.awayTeam.name
      : dataset.match.homeTeam.name;
  return `${side.team} parte con ventaja relativa por la combinación de fuerza, forma y producción esperada; ${opponent} necesita ajustar el ritmo para reducir esa brecha. ${volumeLeader}. El rango central se concentra alrededor de ${totalGoals.toFixed(1)} goles, ${lineupNote}.`;
}

function buildScenarios(
  dataset: MatchDataset,
  probabilities: { home: number; draw: number; away: number },
  features: ReturnType<typeof buildFeatures>,
) {
  const homeTeam = dataset.match.homeTeam.name;
  const awayTeam = dataset.match.awayTeam.name;
  const homeAttackVolume = dataset.home.shots + dataset.home.shotsOnTarget * 1.8;
  const awayAttackVolume = dataset.away.shots + dataset.away.shotsOnTarget * 1.8;
  const homeIsFavorite = probabilities.home >= probabilities.away;
  const favorite = homeIsFavorite ? homeTeam : awayTeam;
  const underdog = homeIsFavorite ? awayTeam : homeTeam;
  const favoriteProbability = homeIsFavorite
    ? probabilities.home
    : probabilities.away;
  const underdogProbability = homeIsFavorite
    ? probabilities.away
    : probabilities.home;
  const volumeLeader =
    homeAttackVolume >= awayAttackVolume
      ? {
          team: homeTeam,
          shots: dataset.home.shots,
          shotsOnTarget: dataset.home.shotsOnTarget,
        }
      : {
          team: awayTeam,
          shots: dataset.away.shots,
          shotsOnTarget: dataset.away.shotsOnTarget,
        };
  const volumeGap = Math.abs(homeAttackVolume - awayAttackVolume);
  const expectedTotal = features.homeLambda + features.awayLambda;
  const drawDescription =
    expectedTotal < 2.35
      ? "Ritmo bajo, pocas ventajas limpias y alta dependencia de balón parado."
      : "Intercambio de llegadas con ventanas de control alternas y margen alto de varianza.";
  const underdogRoute =
    underdog === homeTeam
      ? `${underdog} necesita proteger carril central, bajar pérdidas y atacar los espacios que deje ${favorite}.`
      : `${underdog} necesita sostener bloque medio, administrar transiciones y no conceder tiros francos a ${favorite}.`;

  if (Math.abs(probabilities.home - probabilities.away) < 4) {
    return [
      {
        title: "Partido dividido por detalles",
        probability: Math.max(probabilities.home, probabilities.away),
        description: `${homeTeam} y ${awayTeam} llegan con señales cercanas; el control puede cambiar con el primer gol o la alineación final.`,
      },
      {
        title: "Empate táctico prolongado",
        probability: probabilities.draw,
        description: drawDescription,
      },
      {
        title: `${volumeLeader.team} aumenta el volumen`,
        probability: Math.min(32, Math.max(18, volumeGap + probabilities.draw / 2)),
        description: `${volumeLeader.team} proyecta ${volumeLeader.shots.toFixed(1)} remates y ${volumeLeader.shotsOnTarget.toFixed(1)} a puerta; si sostiene ese ritmo puede inclinar corners y tiros.`,
      },
    ];
  }

  return [
    {
      title: `${favorite} controla territorio`,
      probability: favoriteProbability,
      description: `${favorite} combina mayor señal 1X2 con volumen esperado; si convierte su dominio en remates claros, el partido se inclina temprano.`,
    },
    {
      title: "Partido bloqueado",
      probability: probabilities.draw,
      description: `${underdogRoute} Este escenario gana peso si el total esperado se mantiene cerca de ${
        expectedTotal < 2.5 ? "un rango bajo" : "un intercambio controlado"
      }.`,
    },
    {
      title: `Respuesta de ${underdog}`,
      probability: Math.max(12, Math.min(underdogProbability, 28)),
      description: `${underdog} tiene ruta competitiva si fuerza pérdidas, gana segundas jugadas y evita que ${favorite} encadene ataques largos.`,
    },
  ];
}

function poissonAtLeast(lambda: number, minimum: number) {
  if (!Number.isFinite(lambda) || lambda <= 0) return 0;
  const maxEvents = Math.max(25, Math.ceil(lambda + 10 * Math.sqrt(lambda)));
  return poissonDistribution(lambda, maxEvents).reduce(
    (total, probability, events) =>
      events >= minimum ? total + probability : total,
    0,
  );
}

function poissonGreaterThan(firstLambda: number, secondLambda: number) {
  if (
    !Number.isFinite(firstLambda) ||
    !Number.isFinite(secondLambda) ||
    firstLambda <= 0 ||
    secondLambda <= 0
  ) {
    return 0;
  }
  const maxLambda = Math.max(firstLambda, secondLambda);
  const maxEvents = Math.max(
    25,
    Math.ceil(maxLambda + 10 * Math.sqrt(maxLambda)),
  );
  const firstDistribution = poissonDistribution(firstLambda, maxEvents);
  const secondDistribution = poissonDistribution(secondLambda, maxEvents);

  return firstDistribution.reduce(
    (total, firstProbability, firstEvents) =>
      total +
      secondDistribution.reduce(
        (rowTotal, secondProbability, secondEvents) =>
          firstEvents > secondEvents
            ? rowTotal + firstProbability * secondProbability
            : rowTotal,
        0,
      ),
    0,
  );
}

export function analyzeMatch(
  dataset: MatchDataset,
  options: { manuallyUpdated?: boolean } = {},
): AnalysisResult {
  const features = buildFeatures(dataset);
  const calibrationSummary = dataset.historical?.calibration;
  const dixonColesRho =
    calibrationSummary?.dixonColesRho ?? DEFAULT_DIXON_COLES_RHO;
  const model = dixonColesMatrix(
    features.homeLambda,
    features.awayLambda,
    dixonColesRho,
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
    seed: deterministicSeed(
      `${dataset.match.id}:${dataset.match.homeTeam.id}:${dataset.match.awayTeam.id}:${dataset.match.kickoff}`,
    ),
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
  const calibrated =
    calibrationSummary && calibrationSummary.sampleSize >= 30
      ? adjustProbabilitiesWithCalibration(blended, calibrationSummary)
      : blended;
  blended.home = calibrated.home;
  blended.draw = calibrated.draw;
  blended.away = calibrated.away;
  const lineupsConfirmed =
    dataset.lineups.length > 0 &&
    dataset.lineups.every((lineup) => lineup.confirmed);
  const reliableBaseStats = hasReliableBaseStats(dataset);
  const freshnessScore = sourceFreshnessScore(dataset.sources);
  const modelStability = calculateModelStability(calibrationSummary);
  const confidence = calculateConfidence({
    coverage: dataset.players.length ? 0.88 : 0.7,
    freshness: freshnessScore,
    agreement: dataset.sources.some((source) => source.status === "conflict")
      ? 0.55
      : 0.86,
    modelStability,
    calibration: (calibrationSummary?.confidenceMultiplier ?? 1) * 0.78,
    lineupConfirmed: lineupsConfirmed,
    hasBaseStats: reliableBaseStats,
  });
  const sourceIds = dataset.sources.map((source) => source.id);
  const normalizedOdds = dataset.odds.map((odd) => ({
    ...odd,
    outcome: normalizeOddOutcome(odd.outcome),
  }));
  const totalGoals = features.homeLambda + features.awayLambda;
  const h2hOutcomes = [
    dataset.match.homeTeam.name,
    "Empate",
    dataset.match.awayTeam.name,
  ] as [string, string, string];
  const fairH2H = fairH2HProbabilities(normalizedOdds, h2hOutcomes);
  const homeOdd = bestOddFor(normalizedOdds, h2hOutcomes[0], "h2h")?.odd;
  const drawOdd = bestOddFor(normalizedOdds, h2hOutcomes[1], "h2h")?.odd;
  const awayOdd = bestOddFor(normalizedOdds, h2hOutcomes[2], "h2h")?.odd;
  const over25Odd = bestOddFor(normalizedOdds, "Más de 2.5", "totals")?.odd;
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
        marketProbability: index < 3 ? fairH2H?.[index] : undefined,
        reason: `Combina fuerza base disponible (${dataset.home.elo} vs ${dataset.away.elo}), forma (${dataset.home.recentPointsPerGame.toFixed(2)} vs ${dataset.away.recentPointsPerGame.toFixed(2)} PPG) e intensidades de gol ${features.homeLambda.toFixed(2)}-${features.awayLambda.toFixed(2)}.`,
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
        reason: `Distribución conjunta Dixon-Coles con lambdas ${features.homeLambda.toFixed(2)}-${features.awayLambda.toFixed(2)} y total esperado ${totalGoals.toFixed(2)}.`,
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
        `${dataset.match.awayTeam.name} más corners`,
        `${dataset.match.homeTeam.name} más de 3.5 corners`,
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
        `${dataset.match.homeTeam.name} más de 1.5 tarjetas`,
        `${dataset.match.awayTeam.name} más de 1.5 tarjetas`,
        "Posible tarjeta roja",
      ],
      reason: "Disciplina reciente, presión competitiva y perfil arbitral disponible.",
    },
    {
      category: "fouls",
      base: features.expectedFouls,
      labels: [
        "Más de 21.5 faltas",
        `${dataset.match.homeTeam.name} más de 10.5 faltas`,
        `${dataset.match.awayTeam.name} más de 9.5 faltas`,
        `${dataset.match.homeTeam.name} más faltas`,
        "Más faltas en 2T",
      ],
      reason: "Frecuencia histórica de duelos, presión y transición.",
    },
    {
      category: "shots",
      base: features.expectedShots,
      labels: [
        `${dataset.match.awayTeam.name} más de 12.5 disparos`,
        `${dataset.match.homeTeam.name} más de 8.5 disparos`,
        "Más de 23.5 disparos",
        `${dataset.match.awayTeam.name} más de 4.5 tiros a puerta`,
        `${dataset.match.homeTeam.name} más de 2.5 tiros a puerta`,
      ],
      reason: "Producción reciente de remates y control territorial esperado.",
    },
    {
      category: "offsides",
      base: features.expectedOffsides,
      labels: [
        "Más de 2.5 fueras de juego",
        `${dataset.match.awayTeam.name} más de 1.5 fueras de juego`,
        `${dataset.match.homeTeam.name} más de 0.5 fueras de juego`,
      ],
      reason: "Altura defensiva y frecuencia de ataques al espacio.",
    },
  ];

  countMarkets.forEach((group) => {
    group.labels.forEach((market, index) => {
      let probability = 0;
      if (group.category === "corners") {
        const probabilities = [
          poissonAtLeast(features.expectedCorners, 8),
          poissonAtLeast(features.expectedCorners, 9),
          poissonGreaterThan(dataset.away.corners, dataset.home.corners),
          poissonAtLeast(dataset.home.corners, 4),
          poissonAtLeast(features.expectedCorners * 0.46, 4),
        ];
        probability = probabilities[index] ?? 0;
      }
      if (group.category === "cards") {
        const probabilities = [
          poissonAtLeast(features.expectedCards, 4),
          poissonAtLeast(features.expectedCards, 5),
          poissonAtLeast(dataset.home.cards, 2),
          poissonAtLeast(dataset.away.cards, 2),
          clamp(1 - Math.exp(-features.expectedCards * 0.045), 0.05, 0.32),
        ];
        probability = probabilities[index] ?? 0;
      }
      if (group.category === "fouls") {
        const probabilities = [
          poissonAtLeast(features.expectedFouls, 22),
          poissonAtLeast(dataset.home.fouls, 11),
          poissonAtLeast(dataset.away.fouls, 10),
          poissonGreaterThan(dataset.home.fouls, dataset.away.fouls),
          poissonGreaterThan(
            features.expectedFouls * 0.54,
            features.expectedFouls * 0.46,
          ),
        ];
        probability = probabilities[index] ?? 0;
      }
      if (group.category === "shots") {
        const probabilities = [
          poissonAtLeast(dataset.away.shots, 13),
          poissonAtLeast(dataset.home.shots, 9),
          poissonAtLeast(features.expectedShots, 24),
          poissonAtLeast(dataset.away.shotsOnTarget, 5),
          poissonAtLeast(dataset.home.shotsOnTarget, 3),
        ];
        probability = probabilities[index] ?? 0;
      }
      if (group.category === "offsides") {
        const probabilities = [
          poissonAtLeast(features.expectedOffsides, 3),
          poissonAtLeast(dataset.away.offsides, 2),
          poissonAtLeast(dataset.home.offsides, 1),
        ];
        probability = probabilities[index] ?? 0;
      }
      predictions.push(
        makePrediction({
          id: `${group.category}-${index}`,
          category: group.category,
          market,
          probability,
          confidence: Math.max(1, confidence - 0.7),
          reason: `${group.reason} Base esperada: ${group.base.toFixed(1)}.`,
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
  const executiveSummary = buildExecutiveSummary(
    dataset,
    blended,
    totalGoals,
  );

  return {
    id: `analysis-${dataset.match.id}`,
    modelVersion: "AMP ensemble 1.1.0",
    generatedAt: new Date().toISOString(),
    manuallyUpdated: Boolean(options.manuallyUpdated),
    match: dataset.match,
    executiveSummary,
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
    arbitrage: findArbitrage(normalizedOdds, dataset.match),
    scenarios: buildScenarios(dataset, { home, draw, away }, features),
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
      freshness: Math.round(freshnessScore * 100),
      agreement: 86,
      modelStability: Math.round(modelStability * 100),
      lineupConfirmed: lineupsConfirmed,
      note: !reliableBaseStats
        ? "Estadisticas base estimadas: la calibracion y la confianza quedan limitadas hasta disponer de conteos confirmados o historico suficiente."
        : calibrationSummary
        ? `Snapshot reproducible de fuentes consultadas con calibración histórica sobre ${calibrationSummary.sampleSize} partidos.`
        : dataset.match.dataOrigin === "DEMO"
          ? "Muestra local: no representa información actual."
          : "Snapshot reproducible de fuentes consultadas.",
    },
    calibration: {
      sampleSize: calibrationSummary?.sampleSize ?? 0,
      brier: calibrationSummary?.brier,
      logLoss: calibrationSummary?.logLoss,
      rps: calibrationSummary?.rps,
      dixonColesRho,
      rhoSampleSize: calibrationSummary?.rhoSampleSize,
      rhoAverageLogLoss: calibrationSummary?.rhoAverageLogLoss,
      applied: Boolean(calibrationSummary && calibrationSummary.sampleSize >= 30),
      confidenceMultiplier: calibrationSummary?.confidenceMultiplier ?? 1,
      note: calibrationSummary
        ? "Las probabilidades 1X2 fueron contraídas hacia tasas empíricas históricas cuando la muestra fue suficiente."
        : "Sin muestra histórica suficiente: el análisis usa el ensamble base y marca menor evidencia de calibración.",
    },
  };
}
