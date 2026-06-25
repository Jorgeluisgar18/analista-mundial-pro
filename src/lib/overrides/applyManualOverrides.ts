import type {
  ManualOverrideImpact,
  ManualOverrideRecord,
  MatchDataset,
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

    if (
      override.type !== "absence" ||
      !override.teamId ||
      !override.impact ||
      !override.area
    ) {
      continue;
    }

    const form =
      override.teamId === adjusted.match.homeTeam.id
        ? adjusted.home
        : override.teamId === adjusted.match.awayTeam.id
          ? adjusted.away
          : undefined;
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
          value: override.description,
          status: "confirmed",
          sourceType: "manual",
          source: "Cambio manual",
          observedAt: override.observedAt,
          url: override.sourceUrl || undefined,
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
