import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import type { AnalysisResult, MatchDataset } from "@/types/domain";

export function ContextSection({
  analysis,
  dataset,
  subsection,
}: {
  analysis: AnalysisResult;
  dataset: MatchDataset;
  subsection: string;
}) {
  const rows = [
    [`Necesidad de ${dataset.match.homeTeam.name}`, dataset.context.homeNeed],
    [`Necesidad de ${dataset.match.awayTeam.name}`, dataset.context.awayNeed],
    ["Motivación local", dataset.context.homeMotivation],
    ["Motivación visitante", dataset.context.awayMotivation],
    ["Presión competitiva", dataset.context.pressure],
    [
      "Forma reciente",
      `${analysis.match.homeTeam.name}: ${dataset.home.recentPointsPerGame} pts/partido · ${analysis.match.awayTeam.name}: ${dataset.away.recentPointsPerGame} pts/partido`,
    ],
  ];
  return (
    <AnalysisSection
      title={`Contexto · ${subsection}`}
      intro="Necesidad competitiva, forma ponderada por rival y condiciones que cambian el significado de las estadísticas."
    >
      <div className="detail-list">
        {rows.map(([title, detail]) => (
          <article key={title}>
            <span>Contexto</span>
            <strong>{title}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>
    </AnalysisSection>
  );
}
