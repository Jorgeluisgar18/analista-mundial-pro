import { normalizeKickoffForAppTimeZone } from "@/lib/time/colombia";
import type {
  MatchDataset,
  NormalizedMatch,
  NormalizedOdds,
  TeamRef,
} from "@/types/domain";

const colombiaBrazilKickoff = normalizeKickoffForAppTimeZone(
  "2026-06-15T18:00:00-04:00",
);
const franceGermanyKickoff = normalizeKickoffForAppTimeZone(
  "2026-06-15T21:00:00-04:00",
);

export const demoMatches: NormalizedMatch[] = [
  {
    id: "demo-col-bra",
    date: colombiaBrazilKickoff.date,
    time: colombiaBrazilKickoff.time,
    kickoff: colombiaBrazilKickoff.kickoff,
    status: "preliminary",
    homeTeam: {
      id: "col",
      name: "Colombia",
      code: "COL",
      colors: ["#f5c842", "#163e8c"],
      flag: "🇨🇴",
    },
    awayTeam: {
      id: "bra",
      name: "Brasil",
      code: "BRA",
      colors: ["#f5d547", "#1d8f4b"],
      flag: "🇧🇷",
    },
    competition: {
      id: "wc-2026",
      name: "FIFA World Cup",
      kind: "NATIONAL",
      stage: "Grupo D",
    },
    venue: "MetLife Stadium",
    city: "East Rutherford",
    country: "Estados Unidos",
    timezone: colombiaBrazilKickoff.timezone,
    dataOrigin: "DEMO",
    fetchedAt: "2026-06-25T14:00:00-05:00",
  },
  {
    id: "demo-fra-ger",
    date: franceGermanyKickoff.date,
    time: franceGermanyKickoff.time,
    kickoff: franceGermanyKickoff.kickoff,
    status: "scheduled",
    homeTeam: {
      id: "fra",
      name: "Francia",
      code: "FRA",
      colors: ["#1f3f8c", "#d9363e"],
      flag: "🇫🇷",
    },
    awayTeam: {
      id: "ger",
      name: "Alemania",
      code: "GER",
      colors: ["#e7e7e7", "#202020"],
      flag: "🇩🇪",
    },
    competition: {
      id: "wc-2026",
      name: "FIFA World Cup",
      kind: "NATIONAL",
      stage: "Grupo F",
    },
    venue: "SoFi Stadium",
    city: "Inglewood",
    country: "Estados Unidos",
    timezone: franceGermanyKickoff.timezone,
    dataOrigin: "DEMO",
    fetchedAt: "2026-06-25T14:00:00-05:00",
  },
];

export const demoDataset: MatchDataset = {
  match: demoMatches[0],
  home: {
    elo: 1812,
    recentPointsPerGame: 1.83,
    goalsFor: 1.67,
    goalsAgainst: 0.83,
    xgFor: 1.46,
    xgAgainst: 1.02,
    shots: 12.7,
    shotsOnTarget: 4.5,
    corners: 4.8,
    cards: 2.4,
    fouls: 12.8,
    offsides: 1.7,
    cleanSheetRate: 0.42,
  },
  away: {
    elo: 1915,
    recentPointsPerGame: 2.08,
    goalsFor: 2.0,
    goalsAgainst: 0.92,
    xgFor: 1.91,
    xgAgainst: 0.91,
    shots: 15.8,
    shotsOnTarget: 5.9,
    corners: 5.6,
    cards: 1.9,
    fouls: 11.4,
    offsides: 2.1,
    cleanSheetRate: 0.46,
  },
  lineups: [
    {
      teamId: "col",
      formation: {
        value: "4-2-3-1",
        status: "expected",
        sourceType: "provider",
        source: "Demo scouting",
        observedAt: "2026-06-25T13:30:00-05:00",
      },
      alternativeFormation: "4-3-3",
      confirmed: false,
      starters: [
        "Vargas",
        "Muñoz",
        "Sánchez",
        "Lucumí",
        "Mojica",
        "Lerma",
        "Ríos",
        "Arias",
        "Rodríguez",
        "Díaz",
        "Córdoba",
      ],
    },
    {
      teamId: "bra",
      formation: {
        value: "4-3-3",
        status: "expected",
        sourceType: "provider",
        source: "Demo scouting",
        observedAt: "2026-06-25T13:30:00-05:00",
      },
      alternativeFormation: "4-2-3-1",
      confirmed: false,
      starters: [
        "Alisson",
        "Vanderson",
        "Marquinhos",
        "Gabriel",
        "Arana",
        "Guimarães",
        "Paquetá",
        "Gerson",
        "Raphinha",
        "Rodrygo",
        "Vinícius",
      ],
    },
  ],
  availability: [
    {
      id: "demo-doubt-1",
      teamId: "col",
      player: "Jhon Durán",
      type: "doubt",
      impact: "Reduce profundidad y amenaza en transiciones.",
      replacement: "Jhon Córdoba",
      evidence: {
        value: "En duda",
        status: "expected",
        sourceType: "provider",
        source: "Datos demostrativos",
        observedAt: "2026-06-25T12:00:00-05:00",
      },
    },
  ],
  players: [
    {
      id: "diaz",
      name: "Luis Díaz",
      teamId: "col",
      position: "EI",
      starterStatus: "expected",
      goalProbability: 0.24,
      assistProbability: 0.18,
      shots: 2.8,
      shotsOnTarget: 1.1,
      foulsCommitted: 1.2,
      foulsReceived: 2.7,
      cardProbability: 0.16,
    },
    {
      id: "james",
      name: "James Rodríguez",
      teamId: "col",
      position: "MCO",
      starterStatus: "expected",
      goalProbability: 0.14,
      assistProbability: 0.29,
      shots: 1.9,
      shotsOnTarget: 0.7,
      foulsCommitted: 0.8,
      foulsReceived: 1.8,
      cardProbability: 0.12,
    },
    {
      id: "vini",
      name: "Vinícius Júnior",
      teamId: "bra",
      position: "EI",
      starterStatus: "expected",
      goalProbability: 0.34,
      assistProbability: 0.23,
      shots: 3.7,
      shotsOnTarget: 1.5,
      foulsCommitted: 0.9,
      foulsReceived: 3.1,
      cardProbability: 0.11,
    },
    {
      id: "raphinha",
      name: "Raphinha",
      teamId: "bra",
      position: "ED",
      starterStatus: "expected",
      goalProbability: 0.27,
      assistProbability: 0.25,
      shots: 3.2,
      shotsOnTarget: 1.3,
      foulsCommitted: 1.1,
      foulsReceived: 1.7,
      cardProbability: 0.14,
    },
    {
      id: "guimaraes",
      name: "Bruno Guimarães",
      teamId: "bra",
      position: "MC",
      starterStatus: "expected",
      goalProbability: 0.1,
      assistProbability: 0.16,
      shots: 1.5,
      shotsOnTarget: 0.5,
      foulsCommitted: 2.1,
      foulsReceived: 1.9,
      cardProbability: 0.26,
    },
  ],
  odds: [
    {
      bookmaker: "Mercado de referencia",
      market: "1X2",
      outcome: "Colombia",
      odd: 3.45,
      observedAt: "2026-06-25T13:45:00-05:00",
    },
    {
      bookmaker: "Mercado de referencia",
      market: "1X2",
      outcome: "Empate",
      odd: 3.25,
      observedAt: "2026-06-25T13:45:00-05:00",
    },
    {
      bookmaker: "Mercado de referencia",
      market: "1X2",
      outcome: "Brasil",
      odd: 2.1,
      observedAt: "2026-06-25T13:45:00-05:00",
    },
    {
      bookmaker: "Mercado de referencia",
      market: "Goles",
      outcome: "Más de 2.5",
      odd: 1.95,
      observedAt: "2026-06-25T13:45:00-05:00",
    },
  ],
  referee: {
    value: "Dato no disponible en la fuente actual",
    status: "unavailable",
    sourceType: "provider",
    source: "Muestra local",
    observedAt: "2026-06-25T14:00:00-05:00",
  },
  weather: {
    value: "24 °C, humedad 56 %, viento 8 km/h",
    status: "expected",
    sourceType: "provider",
    source: "Open-Meteo (demostración)",
    observedAt: "2026-06-25T13:45:00-05:00",
  },
  context: {
    homeNeed:
      "Colombia priorizaría puntuar y proteger el carril central antes de acelerar.",
    awayNeed:
      "Brasil buscaría controlar territorio y asegurar ventaja temprana en el grupo.",
    homeMotivation: "Competir ante un favorito directo y sostener opciones de liderato.",
    awayMotivation: "Confirmar favoritismo sin conceder transiciones.",
    pressure: "Alta, con margen táctico reducido para errores en salida.",
    tacticalSummary:
      "Brasil proyecta amplitud y volumen de remate; Colombia responde con bloque medio y salidas hacia el costado izquierdo.",
  },
  sources: [
    {
      id: "src-form",
      label: "Histórico demostrativo",
      type: "provider",
      status: "expected",
      observedAt: "2026-06-25T13:00:00-05:00",
      detail: "Ventana reciente ponderada por rival.",
    },
    {
      id: "src-lineup",
      label: "Alineaciones esperadas demo",
      type: "provider",
      status: "expected",
      observedAt: "2026-06-25T13:30:00-05:00",
      detail: "No son onces oficiales.",
    },
    {
      id: "src-weather",
      label: "Open-Meteo demo",
      type: "provider",
      status: "expected",
      observedAt: "2026-06-25T13:45:00-05:00",
      detail: "Pronóstico climático simulado.",
    },
    {
      id: "src-odds",
      label: "Cuotas demostrativas",
      type: "provider",
      status: "expected",
      observedAt: "2026-06-25T13:45:00-05:00",
      detail: "No representan cuotas actuales.",
    },
  ],
};

function replaceTeamNames(value: string, homeName: string, awayName: string) {
  return value
    .replaceAll("Colombia", homeName)
    .replaceAll("Brasil", awayName);
}

function adaptDemoContext(
  context: MatchDataset["context"],
  homeName: string,
  awayName: string,
): MatchDataset["context"] {
  return {
    homeNeed: replaceTeamNames(context.homeNeed, homeName, awayName),
    awayNeed: replaceTeamNames(context.awayNeed, homeName, awayName),
    homeMotivation: replaceTeamNames(context.homeMotivation, homeName, awayName),
    awayMotivation: replaceTeamNames(context.awayMotivation, homeName, awayName),
    pressure: replaceTeamNames(context.pressure, homeName, awayName),
    tacticalSummary: replaceTeamNames(context.tacticalSummary, homeName, awayName),
  };
}

function adaptDemoTeamId(
  teamId: string,
  homeTeam: TeamRef,
  awayTeam: TeamRef,
) {
  return teamId === demoDataset.match.homeTeam.id ? homeTeam.id : awayTeam.id;
}

function adaptDemoOdds(
  odds: NormalizedOdds[],
  homeName: string,
  awayName: string,
) {
  return odds.map((odd) => ({
    ...odd,
    outcome:
      odd.outcome === demoDataset.match.homeTeam.name
        ? homeName
        : odd.outcome === demoDataset.match.awayTeam.name
          ? awayName
          : odd.outcome,
  }));
}

export function getDemoDatasetById(id: string): MatchDataset | null {
  const match = demoMatches.find((demoMatch) => demoMatch.id === id);
  if (!match) return null;

  const dataset = structuredClone(demoDataset);
  dataset.match = structuredClone(match);

  if (match.id === demoDataset.match.id) return dataset;

  const homeName = match.homeTeam.name;
  const awayName = match.awayTeam.name;

  dataset.context = adaptDemoContext(dataset.context, homeName, awayName);
  dataset.lineups = dataset.lineups.map((lineup) => ({
    ...lineup,
    teamId: adaptDemoTeamId(lineup.teamId, match.homeTeam, match.awayTeam),
    starters: [],
    confirmed: false,
  }));
  dataset.players = [];
  dataset.availability = [];
  dataset.odds = adaptDemoOdds(dataset.odds, homeName, awayName);

  return dataset;
}
