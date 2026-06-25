import type { Prediction } from "@/types/domain";

export function MarketTable({
  predictions,
}: {
  predictions: Prediction[];
}) {
  return (
    <div className="table-scroll">
      <table className="market-table">
        <thead>
          <tr>
            <th>Mercado</th>
            <th>Probabilidad</th>
            <th>Intervalo</th>
            <th>Cuota mín.</th>
            <th>Valor</th>
            <th>Confianza</th>
            <th>Riesgo</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((prediction) => (
            <tr key={prediction.id}>
              <td>
                <strong>{prediction.market}</strong>
                <small>{prediction.reason}</small>
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
