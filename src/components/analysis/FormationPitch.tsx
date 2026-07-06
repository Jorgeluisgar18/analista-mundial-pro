import type { LineupProjection, TeamRef } from "@/types/domain";

function parseFormation(value: unknown) {
  const parts = String(value ?? "")
    .match(/\d+/g)
    ?.map((part) => Number(part))
    .filter((part) => Number.isFinite(part) && part > 0);
  return parts?.length ? parts : [4, 4, 2];
}

function chunkPlayers(starters: string[], formation: number[]) {
  const players = starters.length
    ? starters
    : ["Portero", ...formation.flatMap((line, index) =>
        Array.from({ length: line }, (_, playerIndex) =>
          `Línea ${index + 1}.${playerIndex + 1}`,
        ),
      )];
  const [goalkeeper = "Portero", ...fieldPlayers] = players;
  let cursor = 0;
  return [
    [goalkeeper],
    ...formation.map((lineSize) => {
      const line = fieldPlayers.slice(cursor, cursor + lineSize);
      cursor += lineSize;
      return line;
    }),
  ].filter((line) => line.length > 0);
}

export function FormationPitch({
  lineup,
  team,
}: {
  lineup: LineupProjection;
  team: TeamRef;
}) {
  const formation = parseFormation(lineup.formation.value);
  const rows = chunkPlayers(lineup.starters ?? [], formation);

  return (
    <div
      className="formation-pitch"
      aria-label={`Campo táctico de ${team.name} en ${String(lineup.formation.value)}`}
    >
      <div className="pitch-lines" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {rows.map((row, rowIndex) => (
        <div className="pitch-row" key={`${team.id}-${rowIndex}`}>
          {row.map((player) => (
            <span className="pitch-player" key={`${team.id}-${rowIndex}-${player}`}>
              {player}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
