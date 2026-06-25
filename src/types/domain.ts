export type EvidenceStatus =
  | "confirmed"
  | "expected"
  | "inferred"
  | "conflict"
  | "unavailable";

export type SourceType = "official" | "provider" | "manual" | "inferred";
export type DataOrigin = "API" | "CACHE" | "DEMO" | "MANUAL";
export type MatchStatus =
  | "scheduled"
  | "preliminary"
  | "lineups-confirmed"
  | "live"
  | "finished"
  | "suspended";
export type CompetitionKind = "NATIONAL" | "CLUB";
export type RiskLevel = "Bajo" | "Medio" | "Alto" | "Observación";
export type ValueTier = "Conservador" | "Moderado" | "Arriesgado" | "Solo observación";

export interface Evidence<T = unknown> {
  value: T;
  status: EvidenceStatus;
  sourceType: SourceType;
  source: string;
  observedAt: string;
  url?: string;
  note?: string;
}

export interface TeamRef {
  id: string;
  name: string;
  code: string;
  colors: [string, string];
  flag?: string;
}

export interface CompetitionRef {
  id: string;
  name: string;
  kind: CompetitionKind;
  stage?: string;
}

export interface NormalizedMatch {
  id: string;
  date: string;
  time: string;
  kickoff: string;
  status: MatchStatus;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  competition: CompetitionRef;
  venue: string;
  city: string;
  country: string;
  timezone: string;
  dataOrigin: DataOrigin;
  fetchedAt: string;
}

export interface TeamForm {
  elo: number;
  recentPointsPerGame: number;
  goalsFor: number;
  goalsAgainst: number;
  xgFor?: number;
  xgAgainst?: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  cards: number;
  fouls: number;
  offsides: number;
  cleanSheetRate: number;
}

export interface PlayerProjection {
  id: string;
  name: string;
  teamId: string;
  position: string;
  starterStatus: EvidenceStatus;
  goalProbability?: number;
  assistProbability?: number;
  shots?: number;
  shotsOnTarget?: number;
  foulsCommitted?: number;
  foulsReceived?: number;
  cardProbability?: number;
}

export interface AvailabilityItem {
  id: string;
  teamId: string;
  player: string;
  type: "injured" | "suspended" | "doubt";
  impact: string;
  replacement?: string;
  evidence: Evidence<string>;
}

export interface LineupProjection {
  teamId: string;
  formation: Evidence<string>;
  alternativeFormation?: string;
  confirmed: boolean;
  starters: string[];
}

export interface NormalizedOdds {
  bookmaker: string;
  market: string;
  outcome: string;
  odd: number;
  observedAt: string;
}

export interface MatchDataset {
  match: NormalizedMatch;
  home: TeamForm;
  away: TeamForm;
  lineups: LineupProjection[];
  availability: AvailabilityItem[];
  players: PlayerProjection[];
  odds: NormalizedOdds[];
  referee: Evidence<string>;
  weather: Evidence<string>;
  context: {
    homeNeed: string;
    awayNeed: string;
    homeMotivation: string;
    awayMotivation: string;
    pressure: string;
    tacticalSummary: string;
  };
  sources: SourceRecord[];
}

export interface SourceRecord {
  id: string;
  label: string;
  type: SourceType;
  status: EvidenceStatus;
  observedAt: string;
  url?: string;
  detail: string;
}

export interface Prediction {
  id: string;
  category:
    | "result"
    | "score"
    | "goals"
    | "corners"
    | "cards"
    | "fouls"
    | "shots"
    | "players"
    | "offsides";
  market: string;
  line?: string;
  probability?: number;
  interval?: [number, number];
  confidence: number;
  riskLevel: RiskLevel;
  risk: string;
  reason: string;
  minimumOddForValue?: number;
  availableOdd?: number;
  expectedValue?: number;
  marketProbability?: number;
  modelEdge?: number;
  valueTier: ValueTier;
  evidenceStatus: EvidenceStatus;
  sourceIds: string[];
}

export interface ArbitrageOpportunity {
  id: string;
  market: string;
  isOpportunity: boolean;
  inverseSum: number;
  margin: number;
  returnAmount: number;
  theoreticalProfit: number;
  bankroll: number;
  outcomes: Array<{
    outcome: string;
    bookmaker: string;
    odd: number;
    stake: number;
  }>;
}

export interface AnalysisResult {
  id: string;
  modelVersion: string;
  generatedAt: string;
  manuallyUpdated: boolean;
  match: NormalizedMatch;
  executiveSummary: string;
  mainProbabilities: {
    home: number;
    draw: number;
    away: number;
  };
  expected: {
    goals: number;
    homeGoals: number;
    awayGoals: number;
    corners: number;
    cards: number;
    confidence: number;
  };
  predictions: Prediction[];
  arbitrage: ArbitrageOpportunity[];
  scenarios: Array<{
    title: string;
    probability: number;
    description: string;
  }>;
  alerts: Array<{
    level: "info" | "warning" | "critical";
    title: string;
    detail: string;
  }>;
  sources: SourceRecord[];
  dataQuality: {
    coverage: number;
    freshness: number;
    agreement: number;
    lineupConfirmed: boolean;
    note: string;
  };
}

export interface ApiUsageSummary {
  provider: string;
  used: number;
  limit: number;
  period: "minute" | "day" | "month" | "fair-use";
  resetsAt: string;
}

export type ManualOverrideImpact = "low" | "medium" | "high";
export type ManualOverrideArea = "attack" | "defense" | "balanced";

export interface ManualOverrideInput {
  type:
    | "absence"
    | "starter"
    | "formation"
    | "referee"
    | "weather"
    | "odds"
    | "suspension";
  description: string;
  sourceUrl?: string;
  observedAt?: string;
  teamId?: string;
  player?: string;
  impact?: ManualOverrideImpact;
  area?: ManualOverrideArea;
  value?: string;
}

export interface ManualOverrideRecord extends ManualOverrideInput {
  id: string;
  observedAt: string;
}
