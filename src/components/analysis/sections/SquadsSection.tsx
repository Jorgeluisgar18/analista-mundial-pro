import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import type { MatchDataset, TeamRef } from "@/types/domain";

type Lineup = MatchDataset["lineups"][number];
type Availability = MatchDataset["availability"][number];

const AVAILABILITY_LABEL: Record<Availability["type"], string> = {
  injured: "Lesionado",
  suspended: "Suspendido",
  doubt: "Duda",
};

const EVIDENCE_LABEL: Record<Availability["evidence"]["status"], string> = {
  confirmed: "Confirmado",
  expected: "Esperado",
  inferred: "Inferido",
  conflict: "Conflicto",
  unavailable: "No disponible",
};

function lineupLabel(lineup: Lineup) {
  if (lineup.status === "official-partial") return "Oficial parcial";
  if (lineup.status === "unavailable") return "No disponible";
  if (lineup.confirmed || lineup.status === "confirmed") return "Confirmada";
  return "Esperada";
}

function teamForLineup(dataset: MatchDataset, lineup: Lineup) {
  return lineup.teamId === dataset.match.homeTeam.id
    ? dataset.match.homeTeam
    : dataset.match.awayTeam;
}

function matchTeams(dataset: MatchDataset): TeamRef[] {
  return [dataset.match.homeTeam, dataset.match.awayTeam];
}

function availabilityForTeam(dataset: MatchDataset, teamId: string) {
  return dataset.availability.filter((item) => item.teamId === teamId);
}

export function SquadsSection({
  dataset,
  subsection,
}: {
  dataset: MatchDataset;
  subsection: string;
}) {
  return (
    <AnalysisSection
      title={`Plantillas · ${subsection}`}
      intro="Alineaciones esperadas o confirmadas, ausencias y efecto táctico de cada reemplazo."
    >
      <div className="lineup-columns">
        {dataset.lineups.length ? (
          dataset.lineups.map((lineup) => {
            const team = teamForLineup(dataset, lineup);
            return (
              <article key={lineup.teamId}>
                <span className="evidence-label">{lineupLabel(lineup)}</span>
                <h3>
                  {team.name} · {String(lineup.formation.value)}
                </h3>
                {lineup.starters.length ? (
                  <ol>
                    {lineup.starters.map((player) => (
                      <li key={player}>{player}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="empty-state">
                    Jugadores esperados pendientes de fuente o proyección.
                  </p>
                )}
              </article>
            );
          })
        ) : (
          <p className="empty-state">
            Alineaciones no disponibles para este partido.
          </p>
        )}
      </div>

      <section
        className="availability-list"
        aria-labelledby="availability-heading"
      >
        <header className="availability-header">
          <span className="evidence-label">Disponibilidad</span>
          <h3 id="availability-heading">Bajas y disponibilidad</h3>
          <p>
            Lesiones, sanciones y dudas reportadas por proveedor o ajuste manual.
            Si la fuente no trae bajas, se muestra explícitamente por equipo.
          </p>
        </header>

        <div className="availability-team-grid">
          {matchTeams(dataset).map((team) => {
            const items = availabilityForTeam(dataset, team.id);
            return (
              <article className="availability-team-card" key={team.id}>
                <div className="availability-team-header">
                  <strong>{team.name}</strong>
                  <small>
                    {items.length
                      ? `${items.length} reporte${items.length > 1 ? "s" : ""}`
                      : "Sin reporte confirmado"}
                  </small>
                </div>

                {items.length ? (
                  <div className="availability-items">
                    {items.map((item) => (
                      <div className="availability-item" key={item.id}>
                        <span
                          className={`availability-type availability-${item.type}`}
                        >
                          {AVAILABILITY_LABEL[item.type]}
                        </span>
                        <div>
                          <strong>{item.player}</strong>
                          <p>{item.impact}</p>
                          <small>
                            Reemplazo probable:{" "}
                            {item.replacement ??
                              "Sin información de reemplazo"}
                          </small>
                        </div>
                        <span className="availability-evidence">
                          {EVIDENCE_LABEL[item.evidence.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">
                    Sin bajas confirmadas o suspendidos reportados para{" "}
                    {team.name} en la fuente actual.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </AnalysisSection>
  );
}
