import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import type { MatchDataset } from "@/types/domain";

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
        {dataset.lineups.map((lineup) => (
          <article key={lineup.teamId}>
            <span className="evidence-label">
              {lineup.confirmed ? "Confirmada" : "Esperada"}
            </span>
            <h3>
              {lineup.teamId === dataset.match.homeTeam.id
                ? dataset.match.homeTeam.name
                : dataset.match.awayTeam.name}{" "}
              · {String(lineup.formation.value)}
            </h3>
            <ol>
              {lineup.starters.map((player) => (
                <li key={player}>{player}</li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      <div className="availability-list">
        {dataset.availability.length ? (
          dataset.availability.map((item) => (
            <article key={item.id}>
              <span className={`availability-type availability-${item.type}`}>
                {item.type}
              </span>
              <div>
                <strong>{item.player}</strong>
                <p>{item.impact}</p>
                <small>Reemplazo probable: {item.replacement ?? "Dato no disponible"}</small>
              </div>
              <span>{item.evidence.status}</span>
            </article>
          ))
        ) : (
          <p className="empty-state">Dato no disponible en la fuente actual.</p>
        )}
      </div>
    </AnalysisSection>
  );
}
