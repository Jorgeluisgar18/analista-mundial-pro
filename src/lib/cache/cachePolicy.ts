export type CacheResource =
  | "match"
  | "lineups"
  | "injuries"
  | "stats"
  | "odds"
  | "weather";

export interface RefreshWindow {
  phase:
    | "far-pre-match"
    | "t-minus-90"
    | "t-minus-15"
    | "post-kickoff";
  ttlMinutes: number;
  reason: string;
}

export interface CacheDecisionInput {
  resource: CacheResource;
  kickoff: string;
  observedAt?: string;
  now?: Date;
  confirmed?: boolean;
}

export interface CacheDecision extends RefreshWindow {
  resource: CacheResource;
  shouldRefresh: boolean;
  ageMinutes?: number;
  nextRefreshAt?: string;
}

const MINUTE = 60_000;

function minutesUntilKickoff(kickoff: string, now: Date) {
  return (new Date(kickoff).getTime() - now.getTime()) / MINUTE;
}

function ttlFor(resource: CacheResource, phase: RefreshWindow["phase"]) {
  const table: Record<CacheResource, Record<RefreshWindow["phase"], number>> = {
    match: {
      "far-pre-match": 360,
      "t-minus-90": 30,
      "t-minus-15": 10,
      "post-kickoff": 1440,
    },
    lineups: {
      "far-pre-match": 180,
      "t-minus-90": 15,
      "t-minus-15": 5,
      "post-kickoff": 1440,
    },
    injuries: {
      "far-pre-match": 360,
      "t-minus-90": 60,
      "t-minus-15": 30,
      "post-kickoff": 1440,
    },
    stats: {
      "far-pre-match": 1440,
      "t-minus-90": 360,
      "t-minus-15": 180,
      "post-kickoff": 1440,
    },
    odds: {
      "far-pre-match": 60,
      "t-minus-90": 15,
      "t-minus-15": 5,
      "post-kickoff": 120,
    },
    weather: {
      "far-pre-match": 360,
      "t-minus-90": 30,
      "t-minus-15": 15,
      "post-kickoff": 360,
    },
  };
  return table[resource][phase];
}

export function refreshWindowFor(
  resource: CacheResource,
  kickoff: string,
  now: Date = new Date(),
): RefreshWindow {
  const minutes = minutesUntilKickoff(kickoff, now);
  const phase =
    minutes <= 0
      ? "post-kickoff"
      : minutes <= 15
        ? "t-minus-15"
        : minutes <= 90
          ? "t-minus-90"
          : "far-pre-match";
  const ttlMinutes = ttlFor(resource, phase);
  const reason =
    phase === "far-pre-match"
      ? "Ventana amplia prepartido; se conservan llamadas API."
      : phase === "t-minus-90"
        ? "Ventana T-90: aumenta la frecuencia por alineaciones, clima y cuotas."
        : phase === "t-minus-15"
          ? "Ventana T-15: se priorizan señales de última hora."
          : "Partido iniciado o pasado; se reduce la presión de refresco prepartido.";

  return { phase, ttlMinutes, reason };
}

export function cacheDecision({
  resource,
  kickoff,
  observedAt,
  now = new Date(),
  confirmed = false,
}: CacheDecisionInput): CacheDecision {
  const window = refreshWindowFor(resource, kickoff, now);
  const ttlMinutes =
    resource === "lineups" && confirmed && window.phase !== "post-kickoff"
      ? 90
      : window.ttlMinutes;

  if (!observedAt) {
    return {
      ...window,
      ttlMinutes,
      resource,
      shouldRefresh: true,
      reason: `${window.reason} Recurso sin snapshot previo.`,
    };
  }

  const observedTime = new Date(observedAt).getTime();
  const ageMinutes = Math.max(0, (now.getTime() - observedTime) / MINUTE);
  const shouldRefresh = ageMinutes > ttlMinutes;
  return {
    ...window,
    ttlMinutes,
    resource,
    shouldRefresh,
    ageMinutes,
    nextRefreshAt: new Date(observedTime + ttlMinutes * MINUTE).toISOString(),
  };
}
