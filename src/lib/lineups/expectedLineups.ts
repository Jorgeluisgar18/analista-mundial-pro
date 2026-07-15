import type {
  LineupProjection,
  MatchDataset,
  PlayerProjection,
  SourceRecord,
} from "@/types/domain";

const DEFAULT_FORMATION = "4-2-3-1";
const DEFAULT_ALTERNATIVE = "4-3-3";

function isUnavailableFormation(lineup: LineupProjection) {
  const value = String(lineup.formation.value ?? "").toLowerCase();
  return (
    lineup.formation.status === "unavailable" ||
    !value.trim() ||
    value.includes("dato no disponible")
  );
}

function normalizedName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unavailablePlayers(dataset: MatchDataset, teamId: string) {
  return new Set(
    dataset.availability
      .filter(
        (item) =>
          item.teamId === teamId &&
          ["injured", "suspended"].includes(item.type),
      )
      .map((item) => normalizedName(item.player)),
  );
}

function playerScore(player: PlayerProjection) {
  const starterBoost =
    player.starterStatus === "confirmed"
      ? 3
      : player.starterStatus === "expected"
        ? 2
        : player.starterStatus === "inferred"
          ? 1
          : 0;
  return (
    starterBoost +
    (player.goalProbability ?? 0) +
    (player.assistProbability ?? 0) +
    (player.shotsOnTarget ?? 0) * 0.08 +
    (player.shots ?? 0) * 0.03
  );
}

function expectedStarters(dataset: MatchDataset, teamId: string) {
  const unavailable = unavailablePlayers(dataset, teamId);
  const candidates = dataset.players
    .filter((player) => player.teamId === teamId)
    .filter((player) => !unavailable.has(normalizedName(player.name)))
    .sort((left, right) => playerScore(right) - playerScore(left))
    .map((player) => player.name);

  const starters = [...new Set(candidates)].slice(0, 11);
  return starters;
}

function expectedFormationEvidence(observedAt = new Date().toISOString()) {
  return {
    value: DEFAULT_FORMATION,
    status: "expected" as const,
    sourceType: "inferred" as const,
    source: "Motor de alineación esperada",
    observedAt,
    note:
      "Formación probable hasta que el proveedor publique el once oficial.",
  };
}

function missingLineup(teamId: string): LineupProjection {
  return {
    teamId,
    formation: expectedFormationEvidence(),
    alternativeFormation: DEFAULT_ALTERNATIVE,
    status: "expected",
    confirmed: false,
    starters: [],
  };
}

function expectedLineupSource(): SourceRecord {
  return {
    id: "expected-lineups",
    label: "Motor de alineación esperada",
    type: "inferred",
    status: "expected",
    observedAt: new Date().toISOString(),
    detail:
      "XI probable generado cuando no hay alineación oficial: prioriza jugadores proyectados y excluye bajas lesionadas o suspendidas.",
  };
}

function partialOfficialLineupSource(): SourceRecord {
  return {
    id: "partial-official-lineups",
    label: "Alineación oficial parcial",
    type: "provider",
    status: "expected",
    observedAt: new Date().toISOString(),
    detail:
      "El proveedor publicó una alineación oficial incompleta; se conservaron los nombres oficiales y se completaron posiciones faltantes como esperadas.",
  };
}

export function withExpectedLineups(dataset: MatchDataset): MatchDataset {
  const next = structuredClone(dataset);
  let changed = false;
  let hasExpectedLineups = false;
  let hasPartialOfficialLineups = false;

  const requiredTeamIds = [
    next.match.homeTeam.id,
    next.match.awayTeam.id,
  ].filter(Boolean);
  const existingTeamIds = new Set(next.lineups.map((lineup) => lineup.teamId));
  for (const teamId of requiredTeamIds) {
    if (!existingTeamIds.has(teamId)) {
      next.lineups.push(missingLineup(teamId));
      existingTeamIds.add(teamId);
    }
  }

  next.lineups = next.lineups.map((lineup) => {
    if (lineup.confirmed && lineup.starters.length >= 11) {
      return { ...lineup, status: "confirmed" };
    }
    const officialPartial = lineup.confirmed && lineup.starters.length > 0;
    const generatedStarters = expectedStarters(next, lineup.teamId);
    const starters =
      lineup.starters.length >= 11
        ? lineup.starters
        : [
            ...lineup.starters,
            ...generatedStarters.filter(
              (player) => !lineup.starters.includes(player),
            ),
          ].slice(0, 11);
    const formation = isUnavailableFormation(lineup)
      ? {
          value: DEFAULT_FORMATION,
          status: "expected" as const,
          sourceType: "inferred" as const,
          source: "Motor de alineación esperada",
          observedAt: new Date().toISOString(),
          note:
            "Formación probable hasta que el proveedor publique el once oficial.",
        }
      : {
          ...lineup.formation,
          status:
            lineup.formation.status === "confirmed"
              ? lineup.formation.status
              : ("expected" as const),
        };

    changed = true;
    hasExpectedLineups ||= !officialPartial;
    hasPartialOfficialLineups ||= officialPartial;
    return {
      ...lineup,
      formation,
      alternativeFormation: lineup.alternativeFormation ?? DEFAULT_ALTERNATIVE,
      status: officialPartial ? "official-partial" : "expected",
      confirmed: false,
      starters,
    };
  });

  if (changed) {
    next.sources = [
      ...next.sources.filter(
        (source) =>
          !["expected-lineups", "partial-official-lineups"].includes(source.id),
      ),
      ...(hasExpectedLineups ? [expectedLineupSource()] : []),
      ...(hasPartialOfficialLineups ? [partialOfficialLineupSource()] : []),
    ];
  }

  return next;
}
