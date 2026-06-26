import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { ProbabilitySummary } from "@/components/analysis/ProbabilitySummary";
import { ConfidenceBadge } from "@/components/analysis/ConfidenceBadge";
import { MetricStrip } from "@/components/analysis/MetricStrip";
import type { AnalysisResult } from "@/types/domain";

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
          <strong>
            {analysis.match.awayTeam.name} genera más volumen;{" "}
            {analysis.match.homeTeam.name} conserva amenaza en transición.
          </strong>
          <p>
            La probabilidad no equivale a certeza. El modelo bajará su
            confianza si las alineaciones difieren de lo esperado.
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
        {analysis.scenarios.map((s) => (
          <article key={s.title}>
            <span>{s.probability.toFixed(1)}%</span>
            <strong>{s.title}</strong>
            <p>{s.description}</p>
          </article>
        ))}
      </div>
    </AnalysisSection>
  );
}
