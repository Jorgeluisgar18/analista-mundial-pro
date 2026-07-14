import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import type { AnalysisResult, MatchDataset } from "@/types/domain";

type HistoricalForm = NonNullable<MatchDataset["historical"]>["homeForm"];

function formDetail({
  base,
  historical,
}: {
  base: MatchDataset["home"];
  historical?: HistoricalForm;
}) {
  const baseSummary = `${base.recentPointsPerGame.toFixed(2)} puntos por partido · ${base.goalsFor.toFixed(2)} goles a favor · ${base.goalsAgainst.toFixed(2)} en contra · Elo ${Math.round(base.elo)}.`;
  if (!historical) {
    return `${baseSummary} Sin muestra histórica persistida; lectura limitada a forma normalizada del proveedor.`;
  }

  return `${baseSummary} Histórico: ${historical.matches} partidos históricos, forma ponderada ${historical.weightedPointsPerGame.toFixed(2)}, ajustada por rival ${historical.strengthAdjustedPointsPerGame.toFixed(2)}, porterías a cero ${(historical.cleanSheetRate * 100).toFixed(0)}%.`;
}

function contextRows({
  analysis,
  dataset,
  subsection,
}: {
  analysis: AnalysisResult;
  dataset: MatchDataset;
  subsection: string;
}) {
  if (subsection === "Forma reciente") {
    return [
      [
        `${analysis.match.homeTeam.name} · puntos por partido`,
        formDetail({
          base: dataset.home,
          historical: dataset.historical?.homeForm,
        }),
      ],
      [
        `${analysis.match.awayTeam.name} · puntos por partido`,
        formDetail({
          base: dataset.away,
          historical: dataset.historical?.awayForm,
        }),
      ],
    ];
  }

  if (subsection === "Motivación y presión") {
    return [
      ["Motivación local", dataset.context.homeMotivation],
      ["Motivación visitante", dataset.context.awayMotivation],
      ["Presión competitiva", dataset.context.pressure],
    ];
  }

  if (subsection === "Rivales") {
    return [
      [
        "Producción ofensiva comparada",
        `${analysis.match.homeTeam.name}: ${dataset.home.goalsFor.toFixed(2)} GF y ${dataset.home.shots.toFixed(1)} remates · ${analysis.match.awayTeam.name}: ${dataset.away.goalsFor.toFixed(2)} GF y ${dataset.away.shots.toFixed(1)} remates.`,
      ],
      [
        "Resistencia defensiva comparada",
        `${analysis.match.homeTeam.name}: ${dataset.home.goalsAgainst.toFixed(2)} GC · ${analysis.match.awayTeam.name}: ${dataset.away.goalsAgainst.toFixed(2)} GC.`,
      ],
    ];
  }

  return [
    [`Necesidad de ${dataset.match.homeTeam.name}`, dataset.context.homeNeed],
    [`Necesidad de ${dataset.match.awayTeam.name}`, dataset.context.awayNeed],
  ];
}

export function ContextSection({
  analysis,
  dataset,
  subsection,
}: {
  analysis: AnalysisResult;
  dataset: MatchDataset;
  subsection: string;
}) {
  const rows = contextRows({ analysis, dataset, subsection });

  return (
    <AnalysisSection
      title={`Contexto · ${subsection}`}
      intro="Necesidad competitiva, forma ponderada por rival y condiciones que cambian el significado de las estadísticas."
    >
      <div className="detail-list">
        {rows.map(([title, detail]) => (
          <article key={title}>
            <span>{subsection}</span>
            <strong>{title}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>
    </AnalysisSection>
  );
}
