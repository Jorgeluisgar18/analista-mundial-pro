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

function ScenarioGrid({ analysis }: { analysis: AnalysisResult }) {
  return (
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
  );
}

export function SummarySection({
  analysis,
  subsection,
}: {
  analysis: AnalysisResult;
  subsection: string;
}) {
  if (subsection === "Probabilidades") {
    return (
      <AnalysisSection
        title="Resumen · Probabilidades"
        intro="Lectura concentrada del 1X2 y del reparto de masa entre local, empate y visitante."
        aside={<ConfidenceBadge value={analysis.expected.confidence} />}
      >
        <div className="summary-probabilities">
          <ProbabilitySummary analysis={analysis} />
        </div>
        <MetricStrip
          items={[
            [analysis.match.homeTeam.name, analysis.mainProbabilities.home, "%"],
            ["Empate", analysis.mainProbabilities.draw, "%"],
            [analysis.match.awayTeam.name, analysis.mainProbabilities.away, "%"],
            ["Goles esperados", analysis.expected.goals],
          ]}
        />
      </AnalysisSection>
    );
  }

  if (subsection === "Escenarios") {
    return (
      <AnalysisSection
        title="Resumen · Escenarios"
        intro="Rutas probables del partido según la distribución del modelo y el contexto táctico disponible."
      >
        <ScenarioGrid analysis={analysis} />
      </AnalysisSection>
    );
  }

  if (subsection === "Confianza") {
    return (
      <AnalysisSection
        title="Resumen · Confianza"
        intro="Factores de confianza que limitan o sostienen la lectura del modelo antes de evaluar mercados."
        aside={<ConfidenceBadge value={analysis.expected.confidence} />}
      >
        <div className="detail-list">
          <article>
            <span>Cobertura</span>
            <strong>Cobertura de datos</strong>
            <p>{analysis.dataQuality.coverage}% · {analysis.dataQuality.note}</p>
          </article>
          <article>
            <span>Consistencia</span>
            <strong>Frescura y acuerdo</strong>
            <p>
              Frescura {analysis.dataQuality.freshness}% · acuerdo entre fuentes{" "}
              {analysis.dataQuality.agreement}%.
            </p>
          </article>
          <article>
            <span>Calibración</span>
            <strong>Calibración histórica</strong>
            <p>{analysis.calibration.note}</p>
          </article>
        </div>
      </AnalysisSection>
    );
  }

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
      <ScenarioGrid analysis={analysis} />
    </AnalysisSection>
  );
}
