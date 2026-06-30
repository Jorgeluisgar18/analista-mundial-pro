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

function predictionRows(predictions: Prediction[]) {
  return predictions
    .map(
      (prediction) => `
        <tr>
          <td><strong>${escapeHtml(prediction.market)}</strong><small>${escapeHtml(prediction.reason)}</small></td>
          <td>${prediction.probability === undefined ? "No disponible" : `${prediction.probability.toFixed(1)}%`}</td>
          <td>${prediction.minimumOddForValue?.toFixed(2) ?? "—"}</td>
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

export function renderAnalysisHtml(analysis: AnalysisResult) {
  const groups = Object.entries(groupPredictionsByCategory(analysis.predictions))
    .map(
      ([category, predictions]) => `
        <section>
          <h2>${escapeHtml(category)}</h2>
          <table>
            <thead><tr><th>Mercado</th><th>Probabilidad</th><th>Cuota mín.</th><th>Confianza</th><th>Riesgo</th></tr></thead>
            <tbody>${predictionRows(predictions ?? [])}</tbody>
          </table>
        </section>`,
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
    .notice{margin-top:30px;padding:18px;border:1px solid var(--line);color:var(--muted)}.notice strong{color:var(--green)}
    footer{margin-top:20px;color:var(--muted);font-size:11px}
    @media(max-width:700px){main{padding:14px}h1{font-size:32px}.probabilities{grid-template-columns:1fr}table{font-size:11px;display:block;overflow:auto}}
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
  ${groups}
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
