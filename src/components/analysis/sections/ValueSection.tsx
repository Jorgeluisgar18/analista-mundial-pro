import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { MarketTable } from "@/components/analysis/MarketTable";
import type { AnalysisResult, Prediction } from "@/types/domain";

export function ValueSection({
  analysis,
  subsection,
  onSelectPrediction,
}: {
  analysis: AnalysisResult;
  subsection: string;
  onSelectPrediction?: (prediction: Prediction) => void;
}) {
  if (subsection === "Surebets") {
    return (
      <AnalysisSection
        title="Valor y riesgo · Surebets"
        intro={
          <>
            El valor compara la probabilidad del modelo con la probabilidad
            implícita sin margen. No garantiza rentabilidad.
            {" "}
            <span
              className="tooltip-trigger"
              title="Un surebet ocurre cuando la suma de las inversas de las cuotas de todos los resultados posibles es menor a 1: Σ (1/cuotaᵢ) < 1. Garantiza beneficio teórico independientemente del resultado. En la práctica, comisiones, límites y latencia pueden eliminar la oportunidad."
            >
              ⓘ
            </span>
          </>
        }
      >
        <div className="surebet-panel">
          <span className="section-kicker">Comprobación aritmética</span>
          <h3>Σ (1 / mejor cuotaᵢ) &lt; 1</h3>
          {analysis.arbitrage.length ? (
            analysis.arbitrage.map((opp) => (
              <article key={opp.id}>
                <strong>
                  {opp.market} · margen teórico {(opp.margin * 100).toFixed(2)}%
                </strong>
                <ul>
                  {opp.outcomes.map((o) => (
                    <li key={o.outcome}>
                      {o.outcome}: {o.odd.toFixed(2)} en {o.bookmaker} · asignación {o.stake.toFixed(2)}
                    </li>
                  ))}
                </ul>
                <p>
                  Beneficio teórico sobre {opp.bankroll.toFixed(2)}: {opp.theoreticalProfit.toFixed(2)}.
                </p>
              </article>
            ))
          ) : (
            <strong>No hay oportunidad aritmética en el snapshot actual.</strong>
          )}
          <p>La latencia, límites, comisiones, reglas y anulaciones pueden eliminar el margen observado.</p>
        </div>
      </AnalysisSection>
    );
  }

  const rows = analysis.predictions
    .filter((p) => p.valueTier === subsection)
    .slice(0, 10);
  const intro =
    subsection === "Solo observación"
      ? "Sin señal de valor suficiente: mercados útiles para monitorear, pero no para tomar decisión sin nueva evidencia."
      : "El valor compara la probabilidad del modelo con la probabilidad implícita sin margen. No garantiza rentabilidad.";

  return (
    <AnalysisSection
      title={`Valor y riesgo · ${subsection}`}
      intro={intro}
    >
      <p className="section-note">
        {subsection === "Solo observación"
          ? "Sin señal de valor: se conserva para seguimiento de cuota, alineaciones o noticias, no como recomendación."
          : "Conservador = EV ≥ 8% y prob. ≥ 62%; Moderado = EV ≥ 4%; Arriesgado = EV positivo pero prob. más baja."}
      </p>
      {rows.length ? (
        <MarketTable predictions={rows} onSelectPrediction={onSelectPrediction} />
      ) : (
        <div className="empty-state">
          Ningún mercado supera los filtros de esta categoría en el snapshot actual.
        </div>
      )}
    </AnalysisSection>
  );
}
