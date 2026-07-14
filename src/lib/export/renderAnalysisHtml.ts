import {
  APP_TIME_ZONE_ABBREVIATION,
  formatTimestampInAppTimeZone,
} from "@/lib/time/colombia";
import type { AnalysisResult, Prediction } from "@/types/domain";

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPercent(value: number | undefined) {
  return value === undefined ? "No disponible" : `${value.toFixed(1)}%`;
}

function predictionRows(predictions: Prediction[]) {
  return predictions
    .map(
      (prediction) => `
        <tr>
          <td><strong>${escapeHtml(prediction.market)}</strong><small>${escapeHtml(prediction.reason)}</small></td>
          <td>${formatPercent(prediction.probability)}</td>
          <td>${prediction.minimumOddForValue?.toFixed(2) ?? "-"}</td>
          <td>${prediction.expectedValue === undefined ? "-" : `${prediction.expectedValue.toFixed(1)}%`}</td>
          <td>${escapeHtml(prediction.confidence.toFixed(1))}/10</td>
          <td><span class="risk">${escapeHtml(prediction.riskLevel)}</span><small>${escapeHtml(prediction.risk)}</small></td>
        </tr>`,
    )
    .join("");
}

function groupPredictionsByCategory(predictions: Prediction[]) {
  return predictions.reduce<Record<string, Prediction[]>>((groups, prediction) => {
    const group = groups[prediction.category] ?? [];
    group.push(prediction);
    groups[prediction.category] = group;
    return groups;
  }, {});
}

function evidenceCards(items: string) {
  return `<div class="sources">${items}</div>`;
}

export function renderAnalysisHtml(analysis: AnalysisResult) {
  const groups = Object.entries(groupPredictionsByCategory(analysis.predictions))
    .map(
      ([category, predictions]) => `
        <section>
          <h2>${escapeHtml(category)}</h2>
          <table>
            <thead><tr><th>Mercado</th><th>Probabilidad</th><th>Cuota min.</th><th>Valor esperado</th><th>Confianza</th><th>Riesgo</th></tr></thead>
            <tbody>${predictionRows(predictions ?? [])}</tbody>
          </table>
        </section>`,
    )
    .join("");

  const scenarios = analysis.scenarios
    .map(
      (scenario) => `
        <div class="source">
          <strong>${escapeHtml(scenario.title)} · ${scenario.probability.toFixed(1)}%</strong>
          <small>${escapeHtml(scenario.description)}</small>
        </div>`,
    )
    .join("");

  const alerts = analysis.alerts
    .map(
      (alert) => `
        <div class="source">
          <strong>${escapeHtml(alert.level.toUpperCase())} · ${escapeHtml(alert.title)}</strong>
          <small>${escapeHtml(alert.detail)}</small>
        </div>`,
    )
    .join("");

  const arbitrage = analysis.arbitrage
    .map(
      (opportunity) => `
        <div class="source">
          <strong>${escapeHtml(opportunity.market)} · margen ${opportunity.margin.toFixed(2)}%</strong>
          <small>${opportunity.isOpportunity ? "Oportunidad teorica detectada" : "Sin surebet accionable"} · retorno ${opportunity.returnAmount.toFixed(2)} · ganancia teorica ${opportunity.theoreticalProfit.toFixed(2)}</small>
        </div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(analysis.match.homeTeam.name)} vs ${escapeHtml(analysis.match.awayTeam.name)} · Analista Mundial Pro</title>
  <style>
    :root{color-scheme:dark;--bg:#061015;--surface:#09171a;--line:#23413a;--text:#edf6f3;--muted:#839b95;--green:#00dea5;--amber:#efc76e;--coral:#ef765f}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px Arial,sans-serif}main{max-width:1180px;margin:auto;padding:36px}
    header{padding:32px;border:1px solid var(--line);background:radial-gradient(circle at top right,rgba(0,222,165,.1),transparent 35%),var(--surface)}
    .kicker{color:var(--green);font-size:10px;letter-spacing:.15em;text-transform:uppercase}h1{margin:10px 0 4px;font-size:46px;letter-spacing:-.05em}header p{color:var(--muted)}
    .probabilities{display:grid;grid-template-columns:repeat(3,1fr);margin-top:26px;border-block:1px solid var(--line)}.probabilities div{padding:18px;border-right:1px solid var(--line)}.probabilities div:last-child{border:0}.probabilities strong{display:block;color:var(--green);font-size:30px;margin-top:6px}
    .summary{margin:22px 0;padding:22px;border-left:3px solid var(--green);background:var(--surface);font:italic 18px/1.6 Georgia,serif}
    section{margin-top:24px}h2{text-transform:uppercase;letter-spacing:.04em;color:var(--green)}table{width:100%;border-collapse:collapse;background:var(--surface)}th,td{padding:12px;border:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--muted);font-size:10px;text-transform:uppercase}td small{display:block;margin-top:5px;color:var(--muted);line-height:1.4}.risk{color:var(--amber)}
    .sources{display:grid;gap:8px}.source{padding:14px;border:1px solid var(--line);background:var(--surface)}.source small{color:var(--muted)}
    .trace{display:grid;grid-template-columns:1.1fr .9fr;gap:1px;border:1px solid var(--line);background:linear-gradient(90deg,rgba(0,222,165,.18),rgba(116,168,255,.12))}
    .trace article,.trace ul{margin:0;padding:16px;background:var(--surface)}.trace span{display:block;color:var(--green);font-size:10px;letter-spacing:.12em;text-transform:uppercase}.trace strong{display:block;margin-top:7px;font-size:18px}.trace p,.trace li span{color:var(--muted);line-height:1.45}.trace ul{display:grid;gap:10px;list-style:none}.trace li strong{font-size:14px}
    .notice{margin-top:30px;padding:18px;border:1px solid var(--line);color:var(--muted)}.notice strong{color:var(--green)}
    footer{margin-top:20px;color:var(--muted);font-size:11px}
    @media(max-width:700px){main{padding:14px}h1{font-size:32px}.probabilities,.trace{grid-template-columns:1fr}table{font-size:11px;display:block;overflow:auto}}
  </style>
</head>
<body>
<main>
  <header>
    <div class="kicker">${escapeHtml(analysis.match.competition.name)} · ${escapeHtml(analysis.match.competition.stage ?? "")}</div>
    <h1>${escapeHtml(analysis.match.homeTeam.name)} × ${escapeHtml(analysis.match.awayTeam.name)}</h1>
    <p>${escapeHtml(analysis.match.date)} · ${escapeHtml(analysis.match.time)} ${APP_TIME_ZONE_ABBREVIATION} · ${escapeHtml(analysis.match.venue)} · Snapshot ${escapeHtml(formatTimestampInAppTimeZone(analysis.generatedAt))}</p>
    <div class="probabilities">
      <div>Local<strong>${analysis.mainProbabilities.home.toFixed(1)}%</strong></div>
      <div>Empate<strong>${analysis.mainProbabilities.draw.toFixed(1)}%</strong></div>
      <div>Visitante<strong>${analysis.mainProbabilities.away.toFixed(1)}%</strong></div>
    </div>
  </header>
  <div class="summary">${escapeHtml(analysis.executiveSummary)}</div>
  <section>
    <h2>Escenarios</h2>
    ${evidenceCards(scenarios || '<div class="source"><strong>Sin escenarios destacados</strong><small>El modelo no encontro bifurcaciones relevantes para este snapshot.</small></div>')}
  </section>
  <section>
    <h2>Alertas</h2>
    ${evidenceCards(alerts || '<div class="source"><strong>Sin alertas criticas</strong><small>No hay avisos operativos destacados en este snapshot.</small></div>')}
  </section>
  ${groups}
  <section>
    <h2>Surebets</h2>
    ${evidenceCards(arbitrage || '<div class="source"><strong>Sin surebet accionable</strong><small>No se detecto arbitraje deportivo con las cuotas disponibles.</small></div>')}
  </section>
  <section>
    <h2>Trazabilidad del modelo</h2>
    <div class="trace">
      <article>
        <span>Version del modelo</span>
        <strong>${escapeHtml(analysis.modelVersion)}</strong>
        <p>Combina forma reciente, fuerza historica, cuotas, alineaciones disponibles y calibracion contra resultados reales.</p>
      </article>
      <ul>
        <li><strong>Poisson + Dixon-Coles</strong><span>Marcadores y dependencia de goles bajos.</span></li>
        <li><strong>Monte Carlo</strong><span>Escenarios e incertidumbre de intensidades.</span></li>
        <li><strong>Regresion logistica</strong><span>Forma, fuerza contextual y señal de mercado.</span></li>
      </ul>
    </div>
  </section>
  <section>
    <h2>Calidad de datos</h2>
    <table>
      <tbody>
        <tr><th>Cobertura</th><td>${analysis.dataQuality.coverage.toFixed(1)}%</td></tr>
        <tr><th>Frescura</th><td>${analysis.dataQuality.freshness.toFixed(1)}%</td></tr>
        <tr><th>Acuerdo de fuentes</th><td>${analysis.dataQuality.agreement.toFixed(1)}%</td></tr>
        <tr><th>Estabilidad del modelo</th><td>${analysis.dataQuality.modelStability.toFixed(1)}%</td></tr>
        <tr><th>Alineacion confirmada</th><td>${analysis.dataQuality.lineupConfirmed ? "Si" : "No"}</td></tr>
        <tr><th>Nota</th><td>${escapeHtml(analysis.dataQuality.note)}</td></tr>
      </tbody>
    </table>
  </section>
  <section>
    <h2>Calibracion historica</h2>
    <table>
      <tbody>
        <tr><th>Muestra</th><td>${analysis.calibration.sampleSize}</td></tr>
        <tr><th>Brier Score</th><td>${analysis.calibration.brier?.toFixed(4) ?? "No disponible"}</td></tr>
        <tr><th>Log Loss</th><td>${analysis.calibration.logLoss?.toFixed(4) ?? "No disponible"}</td></tr>
        <tr><th>RPS</th><td>${analysis.calibration.rps?.toFixed(4) ?? "No disponible"}</td></tr>
        <tr><th>Dixon-Coles rho</th><td>${analysis.calibration.dixonColesRho?.toFixed(4) ?? "No disponible"}</td></tr>
        <tr><th>Aplicada</th><td>${analysis.calibration.applied ? "Si" : "No"}</td></tr>
        <tr><th>Nota</th><td>${escapeHtml(analysis.calibration.note)}</td></tr>
      </tbody>
    </table>
  </section>
  <section>
    <h2>Fuentes y evidencia</h2>
    <div class="sources">
      ${analysis.sources
        .map(
          (source) =>
            `<div class="source"><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.status)} · ${escapeHtml(formatTimestampInAppTimeZone(source.observedAt))} · ${escapeHtml(source.detail)}</small></div>`,
        )
        .join("")}
    </div>
  </section>
  <div class="notice"><strong>Juego responsable.</strong> Este análisis es probabilístico y no garantiza resultados. Las apuestas deportivas implican riesgo de pérdida de dinero. No apuestes dinero que no puedas perder. Usa esta información solo como apoyo analítico.</div>
  <footer>Modelo ${escapeHtml(analysis.modelVersion)} · Confianza ${analysis.expected.confidence.toFixed(1)}/10 · ID ${escapeHtml(analysis.id)}</footer>
</main>
</body>
</html>`;
}
