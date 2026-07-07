import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import type { MatchDataset, PlayerProjection } from "@/types/domain";

type PlayerMetric = {
  label: string;
  value: (player: PlayerProjection) => string;
};

const SORT_KEYS: Record<string, keyof PlayerProjection> = {
  Goleadores: "goalProbability",
  Asistencias: "assistProbability",
  Disparos: "shots",
  Tarjetas: "cardProbability",
  Faltas: "foulsCommitted",
};

const METRICS: Record<string, PlayerMetric[]> = {
  Goleadores: [
    {
      label: "Probabilidad de gol",
      value: (player) => `${Math.round((player.goalProbability ?? 0) * 100)}%`,
    },
    {
      label: "Tiros",
      value: (player) => player.shots?.toFixed(1) ?? "—",
    },
  ],
  Asistencias: [
    {
      label: "Probabilidad de asistencia",
      value: (player) => `${Math.round((player.assistProbability ?? 0) * 100)}%`,
    },
    {
      label: "Rol",
      value: (player) => player.position,
    },
  ],
  Disparos: [
    {
      label: "Tiros",
      value: (player) => player.shots?.toFixed(1) ?? "—",
    },
    {
      label: "Tiros al arco",
      value: (player) => player.shotsOnTarget?.toFixed(1) ?? "—",
    },
  ],
  Faltas: [
    {
      label: "Faltas cometidas",
      value: (player) => player.foulsCommitted?.toFixed(1) ?? "—",
    },
    {
      label: "Faltas recibidas",
      value: (player) => player.foulsReceived?.toFixed(1) ?? "—",
    },
  ],
  Tarjetas: [
    {
      label: "Probabilidad de tarjeta",
      value: (player) => `${Math.round((player.cardProbability ?? 0) * 100)}%`,
    },
    {
      label: "Faltas cometidas",
      value: (player) => player.foulsCommitted?.toFixed(1) ?? "—",
    },
  ],
};

export function PlayersSection({
  dataset,
  subsection,
}: {
  dataset: MatchDataset;
  subsection: string;
}) {
  const sortKey = SORT_KEYS[subsection] ?? "shots";
  const metrics = METRICS[subsection] ?? METRICS.Disparos;
  const players = [...dataset.players].sort(
    (a, b) => Number(b[sortKey] ?? 0) - Number(a[sortKey] ?? 0),
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
              <small>
                {player.position} · {player.starterStatus}
              </small>
            </div>
            <dl>
              {metrics.map((metric) => (
                <div key={metric.label}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value(player)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </AnalysisSection>
  );
}
