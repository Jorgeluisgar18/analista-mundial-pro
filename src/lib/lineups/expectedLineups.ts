import type {
  LineupProjection,
  MatchDataset,
  PlayerProjection,
  SourceRecord,
} from "@/types/domain";

const DEFAULT_FORMATION = "4-2-3-1";
const DEFAULT_ALTERNATIVE = "4-3-3";
const GENERATED_LINEUP_SOURCE_IDS = new Set([
  "expected-lineups",
  "partial-official-lineups",
]);

type PlayerPositionGroup =
  "goalkeeper" | "defender" | "midfielder" | "forward" | "unknown";

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

function playerPositionGroup(position: string): PlayerPositionGroup {
  const normalized = normalizedName(position);
  if (/^(g|gk|goalkeeper|goalie|keeper|portero|arquero)$/.test(normalized)) {
    return "goalkeeper";
  }
  if (
    /^(d|df|def|defender|defense|defence|defensa|cb|rb|lb|lwb|rwb|lateral|central)$/.test(
      normalized,
    )
  ) {
    return "defender";
  }
  if (
    /^(m|mf|mid|midfielder|midfield|medio|mediocampista|volante|cm|dm|am|cam|cdm|mc|mco)$/.test(
      normalized,
    )
  ) {
    return "midfielder";
  }
  if (
    /^(f|fw|forward|striker|attacker|delantero|winger|extremo|st|cf|lw|rw|ed|ei)$/.test(
      normalized,
    )
  ) {
    return "forward";
  }
  return "unknown";
}

function formationLineCounts(value: string) {
  const lines = value.match(/\d+/g)?.map(Number);
  return lines?.length &&
    lines.every((line) => line > 0) &&
    lines.reduce((total, line) => total + line, 0) === 10
    ? lines
    : [4, 2, 3, 1];
}

function expectedStarters(
  dataset: MatchDataset,
  teamId: string,
  formation: string,
  canRelyOnExistingOfficialStarter = false,
) {
  const unavailable = unavailablePlayers(dataset, teamId);
  const ranked = dataset.players
    .filter((player) => player.teamId === teamId)
    .filter((player) => !unavailable.has(normalizedName(player.name)))
    .sort((left, right) => playerScore(right) - playerScore(left));
  const seenNames = new Set<string>();
  const candidates = ranked.filter((player) => {
    const name = normalizedName(player.name);
    if (!name || seenNames.has(name)) return false;
    seenNames.add(name);
    return true;
  });
  const goalkeepers = candidates.filter(
    (player) => playerPositionGroup(player.position) === "goalkeeper",
  );
  if (!goalkeepers.length && !canRelyOnExistingOfficialStarter) return [];

  const lines = formationLineCounts(formation);
  const starters: PlayerProjection[] = goalkeepers.length
    ? [goalkeepers[0]]
    : [];
  const selectedNames = new Set(
    goalkeepers.length ? [normalizedName(goalkeepers[0].name)] : [],
  );
  const addPositionGroup = (group: PlayerPositionGroup, count: number) => {
    for (const player of candidates) {
      if (starters.length >= 11 || count <= 0) break;
      if (
        playerPositionGroup(player.position) !== group ||
        selectedNames.has(normalizedName(player.name))
      ) {
        continue;
      }
      starters.push(player);
      selectedNames.add(normalizedName(player.name));
      count -= 1;
    }
  };

  addPositionGroup("defender", lines[0] ?? 4);
  addPositionGroup(
    "midfielder",
    lines.slice(1, -1).reduce((total, line) => total + line, 0),
  );
  addPositionGroup("forward", lines.at(-1) ?? 1);

  for (const player of candidates) {
    if (starters.length >= 11) break;
    const name = normalizedName(player.name);
    if (
      selectedNames.has(name) ||
      playerPositionGroup(player.position) === "goalkeeper"
    ) {
      continue;
    }
    starters.push(player);
    selectedNames.add(name);
  }

  return starters.map((player) => player.name);
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

function unavailableFormationEvidence(observedAt = new Date().toISOString()) {
  return {
    value: "Alineación no disponible para partido finalizado",
    status: "unavailable" as const,
    sourceType: "inferred" as const,
    source: "Control de integridad de alineaciones",
    observedAt,
    note:
      "No se infiere un once probable después de que el partido ha finalizado.",
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

function unavailableLineup(teamId: string): LineupProjection {
  return {
    teamId,
    formation: unavailableFormationEvidence(),
    status: "unavailable",
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
      "Sin XI oficial: usa una formación de referencia y solo proyecta nombres con datos de plantilla y posición disponibles; excluye bajas registradas como lesionadas o suspendidas.",
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
      "El proveedor publicó una alineación oficial incompleta; se conserva la información oficial y solo se completa con nombres y posiciones respaldados por datos de plantilla.",
  };
}

export function withExpectedLineups(dataset: MatchDataset): MatchDataset {
  const next = structuredClone(dataset);
  next.sources = next.sources.filter(
    (source) => !GENERATED_LINEUP_SOURCE_IDS.has(source.id),
  );
  let changed = false;
  let hasExpectedLineups = false;
  let hasPartialOfficialLineups = false;

  const requiredTeamIds = [
    next.match.homeTeam.id,
    next.match.awayTeam.id,
  ].filter(Boolean);

  if (next.match.status === "finished") {
    const existingLineups = new Map(
      next.lineups.map((lineup) => [lineup.teamId, lineup]),
    );
    next.lineups = requiredTeamIds.map((teamId) => {
      const lineup = existingLineups.get(teamId);
      if (
        !lineup ||
        (!lineup.confirmed &&
          lineup.status !== "confirmed" &&
          lineup.status !== "official-partial")
      ) {
        return unavailableLineup(teamId);
      }
      const confirmed =
        lineup.status !== "official-partial" && lineup.starters.length >= 11;
      return {
        ...lineup,
        confirmed,
        status: confirmed ? "confirmed" : "official-partial",
      };
    });
    return next;
  }

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
    const officialPartial =
      lineup.confirmed || lineup.status === "official-partial";
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
    const generatedStarters = expectedStarters(
      next,
      lineup.teamId,
      String(formation.value),
      officialPartial && lineup.starters.length > 0,
    );
    const starters =
      lineup.starters.length >= 11
        ? lineup.starters
        : [
            ...lineup.starters,
            ...generatedStarters.filter(
              (player) => !lineup.starters.includes(player),
            ),
          ].slice(0, 11);

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
      ...next.sources,
      ...(hasExpectedLineups ? [expectedLineupSource()] : []),
      ...(hasPartialOfficialLineups ? [partialOfficialLineupSource()] : []),
    ];
  }

  return next;
}
