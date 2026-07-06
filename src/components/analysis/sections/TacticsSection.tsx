import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { FormationPitch } from "@/components/analysis/FormationPitch";
import type { MatchDataset } from "@/types/domain";

function lineupLabel(lineup: MatchDataset["lineups"][number]) {
  if (lineup.status === "official-partial") return "Oficial parcial";
  if (lineup.status === "unavailable") return "No disponible";
  if (lineup.confirmed || lineup.status === "confirmed") return "Confirmada";
  return "Esperada";
}

export function TacticsSection({
  dataset,
  subsection,
}: {
  dataset: MatchDataset;
  subsection: string;
}) {
  const home = dataset.match.homeTeam.name;
  const away = dataset.match.awayTeam.name;
  const homeShotShare =
    dataset.home.shots + dataset.away.shots > 0
      ? dataset.home.shots / (dataset.home.shots + dataset.away.shots)
      : 0.5;
  const volumeTeam = homeShotShare >= 0.5 ? home : away;
  const transitionTeam = homeShotShare >= 0.5 ? away : home;

  return (
    <AnalysisSection
      title={`Táctica · ${subsection}`}
      intro={dataset.context.tacticalSummary}
    >
      <div className="formation-grid">
        {dataset.lineups.length ? (
          dataset.lineups.map((lineup) => {
            const team =
              lineup.teamId === dataset.match.homeTeam.id
                ? dataset.match.homeTeam
                : dataset.match.awayTeam;
            return (
              <article className="formation-card" key={lineup.teamId}>
                <span>{team.name}</span>
                <strong>{String(lineup.formation.value)}</strong>
                <small>
                  {lineup.alternativeFormation
                    ? `Alternativa ${lineup.alternativeFormation} · `
                    : ""}
                  {lineupLabel(lineup)}
                </small>
                <FormationPitch lineup={lineup} team={team} />
              </article>
            );
          })
        ) : (
          <p className="empty-state">
            Alineaciones no disponibles para este partido.
          </p>
        )}
      </div>
      <div className="tactical-notes">
        <article>
          <span>Plan ofensivo</span>
          <p>
            {volumeTeam} proyecta mayor volumen de ataque; la lectura depende
            de si puede sostener amplitud y presencia en zona de remate.
          </p>
        </article>
        <article>
          <span>Plan defensivo</span>
          <p>
            {transitionTeam} necesita cerrar carril central y elegir mejor sus
            salidas para no partir el bloque.
          </p>
        </article>
        <article>
          <span>Duelo clave</span>
          <p>
            El duelo determinante será la banda fuerte de {volumeTeam} contra
            la primera cobertura de {transitionTeam}; ahí puede nacer la ventaja
            territorial.
          </p>
        </article>
        <article>
          <span>Ajuste de segundo tiempo</span>
          <p>
            Si el marcador permanece cerrado, un mediocampista adicional puede
            cambiar el ritmo y reducir mercados de volumen.
          </p>
        </article>
      </div>
    </AnalysisSection>
  );
}
