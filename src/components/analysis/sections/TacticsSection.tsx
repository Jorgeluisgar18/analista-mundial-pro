import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import type { MatchDataset } from "@/types/domain";

export function TacticsSection({
  dataset,
  subsection,
}: {
  dataset: MatchDataset;
  subsection: string;
}) {
  return (
    <AnalysisSection
      title={`Táctica · ${subsection}`}
      intro={dataset.context.tacticalSummary}
    >
      <div className="formation-grid">
        {dataset.lineups.map((lineup) => {
          const team =
            lineup.teamId === dataset.match.homeTeam.id
              ? dataset.match.homeTeam
              : dataset.match.awayTeam;
          return (
            <article className="formation-card" key={lineup.teamId}>
              <span>{team.name}</span>
              <strong>{String(lineup.formation.value)}</strong>
              <small>
                Alternativa {lineup.alternativeFormation} ·{" "}
                {lineup.confirmed ? "Confirmada" : "Esperada"}
              </small>
              <div className="formation-lines" aria-hidden="true">
                <i /><i /><i /><i />
              </div>
              <ul>
                {lineup.starters.slice(0, 6).map((player) => (
                  <li key={player}>{player}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
      <div className="tactical-notes">
        <article>
          <span>Plan ofensivo</span>
          <p>{dataset.match.awayTeam.name} busca amplitud, fijación exterior y llegada del interior al área.</p>
        </article>
        <article>
          <span>Plan defensivo</span>
          <p>{dataset.match.homeTeam.name} protege el carril central y orienta la presión hacia banda.</p>
        </article>
        <article>
          <span>Duelo clave</span>
          <p>Luis Díaz frente al lateral adelantado: transición contra recuperación.</p>
        </article>
        <article>
          <span>Ajuste de segundo tiempo</span>
          <p>Un mediocampista adicional puede reducir ritmo si el marcador permanece cerrado.</p>
        </article>
      </div>
    </AnalysisSection>
  );
}
