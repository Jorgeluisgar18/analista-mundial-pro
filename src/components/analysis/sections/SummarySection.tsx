import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { ProbabilitySummary } from "@/components/analysis/ProbabilitySummary";
import { ConfidenceBadge } from "@/components/analysis/ConfidenceBadge";
import { MetricStrip } from "@/components/analysis/MetricStrip";
import type { AnalysisResult } from "@/types/domain";

function mainSignal(analysis: AnalysisResult) {
  const probabilities = [
    {
      label: analysis.match.homeTeam.name,
      value: analysis.mainProbabilities.home,
      role: "local",
    },
    { label: "Empate", value: analysis.mainProbabilities.draw, role: "empate" },
    {
      label: analysis.match.awayTeam.name,
      value: analysis.mainProbabilities.away,
      role: "visitante",
    },
  ].sort((a, b) => b.value - a.value);
  const leader = probabilities[0];
  const second = probabilities[1];
  const gap = leader.value - second.value;

  if (leader.role === "empate" || gap < 4) {
    return `Partido muy parejo: la brecha principal es de solo ${gap.toFixed(1)} puntos porcentuales.`;
  }

  return `${leader.label} concentra la señal principal con ${leader.value.toFixed(1)}%, ${gap.toFixed(1)} pp por encima de ${second.label}.`;
}

export function SummarySection({ analysis }: { analysis: AnalysisResult }) {
  return (
    <AnalysisSection
      title="Lectura ejecutiva"
      intro={analysis.executiveSummary}
      aside={<ConfidenceBadge value={analysis.expected.confidence} />}
    >
      <div className="summary-grid">
        <div className="summary-probabilities">
          <ProbabilitySummary analysis={analysis} />
        </div>
        <div className="summary-signal">
          <span className="section-kicker">Señal principal</span>
          <strong>{mainSignal(analysis)}</strong>
          <p>
            La probabilidad no equivale a certeza. El modelo baja su confianza
            cuando las alineaciones, fuentes o cuotas tienen cobertura limitada.
          </p>
        </div>
      </div>
      <MetricStrip
        items={[
          ["Goles", analysis.expected.goals],
          ["Corners", analysis.expected.corners],
          ["Tarjetas", analysis.expected.cards],
          ["Cobertura", analysis.dataQuality.coverage, "%"],
        ]}
      />
      <div className="scenario-grid">
        {(analysis.scenarios ?? []).length ? (
          (analysis.scenarios ?? []).map((scenario) => (
            <article key={scenario.title}>
              <span>{scenario.probability.toFixed(1)}%</span>
              <strong>{scenario.title}</strong>
              <p>{scenario.description}</p>
            </article>
          ))
        ) : (
          <p className="empty-state">
            No hay escenarios modelados para este partido.
          </p>
        )}
      </div>
    </AnalysisSection>
  );
}
