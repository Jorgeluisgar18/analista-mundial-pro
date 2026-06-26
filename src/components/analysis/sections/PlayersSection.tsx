import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import type { MatchDataset } from "@/types/domain";

const SORT_KEYS: Record<string, string> = {
  Goleadores: "goalProbability",
  Asistencias: "assistProbability",
  Tarjetas: "cardProbability",
  Faltas: "foulsCommitted",
};

export function PlayersSection({
  dataset,
  subsection,
}: {
  dataset: MatchDataset;
  subsection: string;
}) {
  const sortKey = SORT_KEYS[subsection] ?? "shots";
  const players = [...dataset.players].sort(
    (a, b) =>
      Number(b[sortKey as keyof typeof b] ?? 0) -
      Number(a[sortKey as keyof typeof a] ?? 0),
  );

  if (players.length === 0) {
    return (
      <AnalysisSection
        title={`Jugadores · ${subsection}`}
        intro="Proyecciones condicionadas a titularidad, rol y minutos esperados. Si cambia el once, deben recalcularse."
      >
        <div className="empty-state">
          No hay proyecciones individuales disponibles para este partido. Las
          fuentes consultadas no incluyen datos de jugadores.
        </div>
      </AnalysisSection>
    );
  }

  return (
    <AnalysisSection
      title={`Jugadores · ${subsection}`}
      intro="Proyecciones condicionadas a titularidad, rol y minutos esperados. Si cambia el once, deben recalcularse."
    >
      <div className="player-ranking">
        {players.map((player, index) => (
          <article key={player.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{player.name}</strong>
              <small>{player.position} · {player.starterStatus}</small>
            </div>
            <dl>
              <div><dt>Gol</dt><dd>{Math.round((player.goalProbability ?? 0) * 100)}%</dd></div>
              <div><dt>Asistencia</dt><dd>{Math.round((player.assistProbability ?? 0) * 100)}%</dd></div>
              <div><dt>Tiros</dt><dd>{player.shots?.toFixed(1) ?? "—"}</dd></div>
              <div><dt>Tarjeta</dt><dd>{Math.round((player.cardProbability ?? 0) * 100)}%</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </AnalysisSection>
  );
}
