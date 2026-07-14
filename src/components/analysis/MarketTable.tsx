import type { Prediction } from "@/types/domain";
import {
  predictionEvidenceSummary,
  predictionEvidenceTone,
} from "@/lib/analysis/predictionEvidence";

const evidenceLabels = {
  confirmed: "Confirmado",
  expected: "Estimado",
  inferred: "Inferido",
  conflict: "Conflicto",
  unavailable: "No disponible",
} satisfies Record<Prediction["evidenceStatus"], string>;

const evidenceDescriptions = {
  confirmed: "Dato observado o confirmado por fuente conectada.",
  expected: "Dato estimado con priors o información previa.",
  inferred: "Dato inferido por el motor con evidencia indirecta.",
  conflict: "Fuentes con señales contradictorias.",
  unavailable: "Sin datos suficientes para sostener el mercado.",
} satisfies Record<Prediction["evidenceStatus"], string>;

export function MarketTable({
  predictions,
  onSelectPrediction,
}: {
  predictions: Prediction[];
  onSelectPrediction?: (prediction: Prediction) => void;
}) {
  if (predictions.length === 0) {
    return (
      <div className="empty-state">
        No hay predicciones disponibles para este mercado en el snapshot actual.
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="market-table" aria-label="Predicciones del mercado con probabilidad, intervalo, cuota mínima, valor, confianza y riesgo">
        <caption className="sr-only">Mercados</caption>
        <thead>
          <tr>
            <th>Mercado</th>
            <th>Probabilidad</th>
            <th>Intervalo</th>
            <th>Cuota mín.</th>
            <th>Valor</th>
            <th>Evidencia</th>
            <th>Confianza</th>
            <th>Riesgo</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((prediction) => (
            <tr
              key={prediction.id}
              onClick={() => onSelectPrediction?.(prediction)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPrediction?.(prediction);
                }
              }}
              tabIndex={onSelectPrediction ? 0 : undefined}
              role={onSelectPrediction ? "button" : undefined}
              aria-label={`Detalle del mercado ${prediction.market}`}
            >
              <td>
                <strong>{prediction.market}</strong>
                <small>{prediction.reason}</small>
                <small className="market-evidence-note">
                  <span>Lectura del mercado</span>
                  {predictionEvidenceSummary(prediction)}
                </small>
                <small className="market-evidence-tone">
                  {predictionEvidenceTone(prediction)}
                </small>
              </td>
              <td>
                {prediction.probability === undefined ? (
                  <span className="not-available">No disponible</span>
                ) : (
                  <div className="table-probability">
                    <span>{prediction.probability.toFixed(1)}%</span>
                    <i>
                      <b style={{ width: `${prediction.probability}%` }} />
                    </i>
                  </div>
                )}
              </td>
              <td>
                {prediction.interval
                  ? `${prediction.interval[0].toFixed(0)}–${prediction.interval[1].toFixed(0)}%`
                  : "—"}
              </td>
              <td>
                {prediction.minimumOddForValue?.toFixed(2) ?? "—"}
              </td>
              <td>
                {prediction.expectedValue === undefined
                  ? prediction.valueTier
                  : `${prediction.expectedValue > 0 ? "+" : ""}${prediction.expectedValue.toFixed(1)}%`}
                {prediction.modelEdge !== undefined ? (
                  <small>
                    Ventaja: {prediction.modelEdge > 0 ? "+" : ""}
                    {prediction.modelEdge.toFixed(1)} pp
                  </small>
                ) : null}
              </td>
              <td>
                <span
                  className={`evidence-pill evidence-pill-${prediction.evidenceStatus}`}
                  title={evidenceDescriptions[prediction.evidenceStatus]}
                >
                  {evidenceLabels[prediction.evidenceStatus]}
                </span>
              </td>
              <td>{prediction.confidence.toFixed(1)}/10</td>
              <td>
                <span
                  className={`risk risk-${prediction.riskLevel.toLowerCase().replace("ó", "o")}`}
                >
                  {prediction.riskLevel}
                </span>
                <small>{prediction.risk}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
