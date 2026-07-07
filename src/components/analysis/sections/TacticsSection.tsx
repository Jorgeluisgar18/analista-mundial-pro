import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { FormationPitch } from "@/components/analysis/FormationPitch";
import type { MatchDataset } from "@/types/domain";

function lineupLabel(lineup: MatchDataset["lineups"][number]) {
  if (lineup.status === "official-partial") return "Oficial parcial";
  if (lineup.status === "unavailable") return "No disponible";
  if (lineup.confirmed || lineup.status === "confirmed") return "Confirmada";
  return "Esperada";
}

function tacticalContext(dataset: MatchDataset) {
  const home = dataset.match.homeTeam.name;
  const away = dataset.match.awayTeam.name;
  const totalShots = dataset.home.shots + dataset.away.shots;
  const homeShotShare = totalShots > 0 ? dataset.home.shots / totalShots : 0.5;
  const volumeTeam = homeShotShare >= 0.5 ? home : away;
  const transitionTeam = homeShotShare >= 0.5 ? away : home;

  return { home, away, volumeTeam, transitionTeam };
}

function FormationView({ dataset }: { dataset: MatchDataset }) {
  return (
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
  );
}

function tacticalRows(dataset: MatchDataset, subsection: string) {
  const { volumeTeam, transitionTeam } = tacticalContext(dataset);

  if (subsection === "Plan ofensivo") {
    return [
      [
        "Volumen y amplitud",
        `${volumeTeam} proyecta mayor volumen de ataque; la lectura depende de si puede sostener amplitud y presencia en zona de remate.`,
      ],
      [
        "Zona de progresión",
        `El ataque debe conectar remate, corners y segundas jugadas sin perder equilibrio ante la transición de ${transitionTeam}.`,
      ],
    ];
  }

  if (subsection === "Plan defensivo") {
    return [
      [
        "Presión defensiva",
        `${transitionTeam} necesita cerrar carril central, orientar la presión hacia banda y evitar que ${volumeTeam} reciba de frente.`,
      ],
      [
        "Coberturas",
        "El modelo baja confianza si el bloque queda largo, porque las transiciones alteran goles, tarjetas y corners.",
      ],
    ];
  }

  if (subsection === "Duelos") {
    return [
      [
        "Duelo clave",
        `La banda fuerte de ${volumeTeam} contra la primera cobertura de ${transitionTeam} puede explicar la ventaja territorial.`,
      ],
      [
        "Ritmo del mediocampo",
        "El equipo que gane segundas jugadas tendrá mejor control sobre faltas tácticas y remates de media distancia.",
      ],
    ];
  }

  if (subsection === "Ajustes 2T") {
    return [
      [
        "Ajuste de segundo tiempo",
        "Si el marcador permanece cerrado, un mediocampista adicional puede cambiar el ritmo y reducir mercados de volumen.",
      ],
      [
        "Plan alternativo",
        "Una modificación de extremos o laterales impacta especialmente corners, tiros y exposición del arquero.",
      ],
    ];
  }

  return [];
}

export function TacticsSection({
  dataset,
  subsection,
}: {
  dataset: MatchDataset;
  subsection: string;
}) {
  const rows = tacticalRows(dataset, subsection);

  return (
    <AnalysisSection
      title={`Táctica · ${subsection}`}
      intro={dataset.context.tacticalSummary}
    >
      {subsection === "Formaciones" ? (
        <FormationView dataset={dataset} />
      ) : (
        <div className="tactical-notes">
          {rows.map(([title, detail]) => (
            <article key={title}>
              <span>{subsection}</span>
              <p>
                <strong>{title}</strong> · {detail}
              </p>
            </article>
          ))}
        </div>
      )}
    </AnalysisSection>
  );
}
