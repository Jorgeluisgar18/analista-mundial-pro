import type {
  Evidence,
  ManualOverrideImpact,
  ManualOverrideRecord,
  MatchDataset,
  NormalizedOdds,
  PlayerProjection,
  TeamForm,
} from "@/types/domain";

const IMPACT_FACTOR: Record<ManualOverrideImpact, number> = {
  low: 0.03,
  medium: 0.07,
  high: 0.12,
};

function applyAttackAbsence(form: TeamForm, factor: number) {
  form.goalsFor *= 1 - factor;
  if (form.xgFor !== undefined) form.xgFor *= 1 - factor;
  form.shots *= 1 - factor * 0.7;
  form.shotsOnTarget *= 1 - factor;
}

function applyDefensiveAbsence(form: TeamForm, factor: number) {
  form.goalsAgainst *= 1 + factor;
  if (form.xgAgainst !== undefined) form.xgAgainst *= 1 + factor;
  form.cleanSheetRate = Math.max(0, form.cleanSheetRate * (1 - factor));
}

function applyAttackBoost(form: TeamForm, factor: number) {
  form.goalsFor *= 1 + factor;
  if (form.xgFor !== undefined) form.xgFor *= 1 + factor;
  form.shots *= 1 + factor * 0.7;
  form.shotsOnTarget *= 1 + factor;
  form.corners *= 1 + factor * 0.35;
}

function applyDefensiveBoost(form: TeamForm, factor: number) {
  form.goalsAgainst *= 1 - factor;
  if (form.xgAgainst !== undefined) form.xgAgainst *= 1 - factor;
  form.cleanSheetRate = Math.min(0.95, form.cleanSheetRate * (1 + factor));
}

function evidenceFromOverride(
  override: ManualOverrideRecord,
): Evidence<string> {
  return {
    value: override.value || override.description,
    status: "confirmed",
    sourceType: "manual",
    source: "Cambio manual",
    observedAt: override.observedAt,
    url: override.sourceUrl || undefined,
  };
}

function teamFormFor(adjusted: MatchDataset, teamId?: string) {
  if (teamId === adjusted.match.homeTeam.id) return adjusted.home;
  if (teamId === adjusted.match.awayTeam.id) return adjusted.away;
  return undefined;
}

function lineupFor(adjusted: MatchDataset, teamId?: string) {
  return adjusted.lineups.find((lineup) => lineup.teamId === teamId);
}

function applyPositiveTeamImpact(
  form: TeamForm,
  impact: ManualOverrideImpact = "medium",
  area: ManualOverrideRecord["area"] = "balanced",
) {
  const factor = IMPACT_FACTOR[impact];
  if (area === "attack" || area === "balanced") {
    applyAttackBoost(form, area === "balanced" ? factor / 2 : factor);
  }
  if (area === "defense" || area === "balanced") {
    applyDefensiveBoost(form, area === "balanced" ? factor / 2 : factor);
  }
}

function playerProjectionFor(
  adjusted: MatchDataset,
  override: ManualOverrideRecord,
): PlayerProjection {
  return {
    id: `manual-starter-${override.id}`,
    name: override.player ?? "Titular confirmado",
    teamId: override.teamId ?? adjusted.match.homeTeam.id,
    position: "N/D",
    starterStatus: "confirmed",
  };
}

function applyFormationOverride(
  adjusted: MatchDataset,
  override: ManualOverrideRecord,
) {
  const formation = override.value?.trim();
  if (!formation) return;

  const lineup = lineupFor(adjusted, override.teamId);
  if (lineup) {
    lineup.formation = evidenceFromOverride(override);
    lineup.confirmed = true;
  }

  const form = teamFormFor(adjusted, override.teamId);
  if (!form) return;
  const firstLine = Number.parseInt(formation.split("-")[0] ?? "", 10);
  if (firstLine >= 5) {
    applyDefensiveBoost(form, 0.04);
    form.shots *= 0.97;
    form.shotsOnTarget *= 0.96;
  } else if (firstLine <= 3) {
    applyAttackBoost(form, 0.04);
    form.goalsAgainst *= 1.03;
    if (form.xgAgainst !== undefined) form.xgAgainst *= 1.03;
  }
}

function applyRefereeOverride(
  adjusted: MatchDataset,
  override: ManualOverrideRecord,
) {
  const value = override.value || override.description;
  adjusted.referee = evidenceFromOverride({ ...override, value });

  const normalized = value.toLowerCase();
  const strict = /estricto|tarjeta|disciplin|faltas|alta/.test(normalized);
  const lenient = /permisivo|pocas|baja|deja jugar/.test(normalized);
  const factor = strict ? 1.12 : lenient ? 0.9 : 1;
  adjusted.home.cards *= factor;
  adjusted.away.cards *= factor;
  adjusted.home.fouls *= strict ? 1.04 : lenient ? 0.96 : 1;
  adjusted.away.fouls *= strict ? 1.04 : lenient ? 0.96 : 1;
}

function applyWeatherOverride(
  adjusted: MatchDataset,
  override: ManualOverrideRecord,
) {
  const value = override.value || override.description;
  adjusted.weather = evidenceFromOverride({ ...override, value });

  const normalized = value.toLowerCase();
  const heavy =
    /lluvia|tormenta|viento|calor|nieve|humedad|pesad/.test(normalized);
  if (!heavy) return;
  for (const form of [adjusted.home, adjusted.away]) {
    form.goalsFor *= 0.96;
    if (form.xgFor !== undefined) form.xgFor *= 0.96;
    form.shots *= 0.95;
    form.shotsOnTarget *= 0.92;
    form.corners *= 0.97;
  }
}

function parseManualOdds(
  value: string | undefined,
): NormalizedOdds[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const odds = parsed.filter(
      (odd): odd is NormalizedOdds =>
        typeof odd === "object" &&
        odd !== null &&
        typeof Reflect.get(odd, "bookmaker") === "string" &&
        typeof Reflect.get(odd, "market") === "string" &&
        typeof Reflect.get(odd, "outcome") === "string" &&
        typeof Reflect.get(odd, "odd") === "number" &&
        typeof Reflect.get(odd, "observedAt") === "string",
    );
    return odds.length ? odds : undefined;
  } catch {
    return undefined;
  }
}

export function applyManualOverrides(
  dataset: MatchDataset,
  overrides: ManualOverrideRecord[],
): MatchDataset {
  const adjusted = structuredClone(dataset);

  for (const override of overrides) {
    adjusted.sources.push({
      id: `manual-${override.id}`,
      label: "Cambio manual",
      type: "manual",
      status: "confirmed",
      observedAt: override.observedAt,
      url: override.sourceUrl || undefined,
      detail: override.description,
    });

    if (override.type === "starter") {
      const form = teamFormFor(adjusted, override.teamId);
      if (!form) continue;
      applyPositiveTeamImpact(form, override.impact, override.area);
      const lineup = lineupFor(adjusted, override.teamId);
      if (lineup && override.player && !lineup.starters.includes(override.player)) {
        lineup.starters.push(override.player);
        lineup.confirmed = true;
      }
      if (
        override.player &&
        !adjusted.players.some(
          (player) =>
            player.teamId === override.teamId &&
            player.name.localeCompare(override.player ?? "", "es", {
              sensitivity: "base",
            }) === 0,
        )
      ) {
        adjusted.players.push(playerProjectionFor(adjusted, override));
      }
      adjusted.players = adjusted.players.map((player) =>
        player.teamId === override.teamId &&
        player.name.localeCompare(override.player ?? "", "es", {
          sensitivity: "base",
        }) === 0
          ? { ...player, starterStatus: "confirmed" }
          : player,
      );
      continue;
    }

    if (override.type === "formation") {
      applyFormationOverride(adjusted, override);
      continue;
    }

    if (override.type === "referee") {
      applyRefereeOverride(adjusted, override);
      continue;
    }

    if (override.type === "weather") {
      applyWeatherOverride(adjusted, override);
      continue;
    }

    if (override.type === "odds") {
      const manualOdds = parseManualOdds(override.value);
      if (manualOdds) adjusted.odds = manualOdds;
      continue;
    }

    if (override.type === "suspension") {
      adjusted.match.status = "suspended";
      continue;
    }

    if (
      override.type !== "absence" ||
      !override.teamId ||
      !override.impact ||
      !override.area
    ) {
      continue;
    }

    const form = teamFormFor(adjusted, override.teamId);
    if (!form) continue;

    const factor = IMPACT_FACTOR[override.impact];
    if (override.area === "attack" || override.area === "balanced") {
      applyAttackAbsence(
        form,
        override.area === "balanced" ? factor / 2 : factor,
      );
    }
    if (override.area === "defense" || override.area === "balanced") {
      applyDefensiveAbsence(
        form,
        override.area === "balanced" ? factor / 2 : factor,
      );
    }

    if (override.player) {
      adjusted.availability.push({
        id: `manual-absence-${override.id}`,
        teamId: override.teamId,
        player: override.player,
        type: "injured",
        impact: override.description,
        evidence: {
          ...evidenceFromOverride(override),
          value: override.description,
        },
      });
      adjusted.players = adjusted.players.filter(
        (player) =>
          !(
            player.teamId === override.teamId &&
            player.name.localeCompare(override.player ?? "", "es", {
              sensitivity: "base",
            }) === 0
          ),
      );
    }
  }

  return adjusted;
}
