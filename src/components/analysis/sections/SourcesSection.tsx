import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { SourceLedger } from "@/components/analysis/SourceLedger";
import type { AnalysisResult, MatchDataset } from "@/types/domain";

function QualityBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}%</strong>
      <i>
        <b style={{ width: `${value}%` }} />
      </i>
    </div>
  );
}

export function SourcesSection({
  analysis,
  dataset,
  subsection,
}: {
  analysis: AnalysisResult;
  dataset: MatchDataset;
  subsection: string;
}) {
  if (subsection === "Calidad") {
    const confirmedLineups = dataset.lineups.filter(
      (lineup) => lineup.confirmed,
    ).length;
    const lineupSummary = dataset.lineups.length
      ? `${confirmedLineups} de ${dataset.lineups.length} alineaciones confirmadas.`
      : "Alineaciones no disponibles.";
    const availabilitySource = dataset.sources.find((source) =>
      source.id.endsWith("-availability"),
    );
    const availabilitySummary = availabilitySource
      ? availabilitySource.detail
      : "No hay evidencia de una consulta de lesiones o sanciones.";
    const statsSources = dataset.sources.filter((source) =>
      /stats|statistics|estad/i.test(`${source.id} ${source.label}`),
    );
    const confirmedStatsSources = statsSources.filter(
      (source) => source.status === "confirmed" || source.status === "inferred",
    );
    const statsSummary = confirmedStatsSources.length
      ? `${confirmedStatsSources.length} fuente(s) con estadísticas confirmadas o inferidas.`
      : "Estadísticas del proveedor no confirmadas.";
    const statsDetail = statsSources.length
      ? statsSources.map((source) => `${source.label}: ${source.detail}`).join(" ")
      : "No hay una fuente estadística registrada para este análisis.";
    const statsCaveat =
      confirmedStatsSources.length > 0
        ? null
        : "Las cifras base normalizadas no son observaciones verificadas del proveedor.";

    return (
      <AnalysisSection
        title="Fuentes · Calidad"
        intro="Cobertura, frescura, acuerdo entre fuentes y trazabilidad de las señales de esta cabina."
      >
        <div className="quality-strip">
          <QualityBar label="Cobertura" value={analysis.dataQuality.coverage} />
          <QualityBar label="Frescura" value={analysis.dataQuality.freshness} />
          <QualityBar label="Acuerdo" value={analysis.dataQuality.agreement} />
          <QualityBar
            label="Estabilidad"
            value={analysis.dataQuality.modelStability}
          />
          <QualityBar
            label="Alineaciones"
            value={analysis.dataQuality.lineupConfirmed ? 100 : 45}
          />
        </div>

        <div className="model-trace-panel" aria-label="Trazabilidad del modelo">
          <h3>Trazabilidad del modelo</h3>
          <article>
            <span>Versión del modelo</span>
            <strong>{analysis.modelVersion}</strong>
            <p>
              El modelo contempla Elo, puntos por partido, goles/xG y
              disponibilidad. Las tarjetas siguientes muestran qué cobertura
              entregaron las fuentes en esta cabina. Cuotas y alineaciones no
              alimentan las probabilidades principales; se evalúan como mercado
              y contexto.
            </p>
          </article>
          <ul>
            <li>
              <strong>Poisson + Dixon-Coles</strong>
              <span>Marcadores y dependencia de goles bajos.</span>
            </li>
            <li>
              <strong>Monte Carlo</strong>
              <span>Escenarios e incertidumbre de intensidades.</span>
            </li>
            <li>
              <strong>Regresión logística</strong>
              <span>
                Diferencias de Elo, puntos por partido y ataque/defensa; sin
                señal de mercado.
              </span>
            </li>
          </ul>
        </div>

        <div
          className="detail-list"
          aria-label="Señales disponibles en este análisis"
        >
          <article>
            <span>Estadísticas base</span>
            <strong>{statsSummary}</strong>
            <p>
              {statsDetail} {statsCaveat}
            </p>
          </article>
          <article>
            <span>Cuotas</span>
            <strong>
              {dataset.odds.length
                ? `${dataset.odds.length} precios cargados`
                : "Sin cuotas disponibles"}
            </strong>
            <p>
              {dataset.odds.length
                ? "Se usan para comparar el mercado y evaluar valor, no para calcular la probabilidad principal 1X2."
                : "No se puede evaluar valor de mercado sin cuotas; el modelo 1X2 sigue siendo independiente de ellas."}
            </p>
          </article>
          <article>
            <span>Alineaciones y disponibilidad</span>
            <strong>{lineupSummary}</strong>
            <p>
              {availabilitySummary} Las alineaciones se presentan como contexto y
              no modifican las probabilidades principales de este modelo.
            </p>
          </article>
          <article>
            <span>Calibración histórica</span>
            <strong>
              {analysis.calibration.applied
                ? `Aplicada con ${analysis.calibration.sampleSize} partidos`
                : "No aplicada"}
            </strong>
            <p>
              {analysis.calibration.applied
                ? "El ajuste histórico sí intervino en las probabilidades de esta cabina."
                : analysis.calibration.note}
            </p>
          </article>
        </div>

        <div
          className="calibration-strip"
          aria-label="Calibración histórica del modelo"
        >
          <article>
            <span>Histórico</span>
            <strong>
              {analysis.calibration.applied
                ? `${analysis.calibration.sampleSize} partidos`
                : "Sin muestra suficiente"}
            </strong>
            <p>{analysis.calibration.note}</p>
          </article>
          <article>
            <span>Brier / Log Loss / RPS</span>
            <strong>
              {analysis.calibration.brier !== undefined
                ? `${analysis.calibration.brier.toFixed(2)} - ${analysis.calibration.logLoss?.toFixed(2)} - ${analysis.calibration.rps?.toFixed(2)}`
                : "Pendiente"}
            </strong>
            <p>
              La calidad mide si el porcentaje puede sostenerse con evidencia
              suficiente o si debe tratarse como aproximación preliminar.
            </p>
          </article>
          <article>
            <span>Dixon-Coles rho</span>
            <strong>
              {analysis.calibration.dixonColesRho !== undefined
                ? analysis.calibration.dixonColesRho.toFixed(3)
                : "Pendiente"}
            </strong>
            <p>
              Ajusta la dependencia de marcadores bajos usando backtesting
              histórico cuando existe muestra calibrada.
            </p>
          </article>
        </div>
      </AnalysisSection>
    );
  }

  if (subsection === "Metodologia" || subsection === "Metodología") {
    return (
      <AnalysisSection
        title="Fuentes · Metodología"
        intro="El 1X2 combina Elo, puntos por partido y métricas de ataque/defensa. Cuotas y alineaciones se presentan por separado, no como variables de la probabilidad principal."
      >
        <div className="methodology">
          <article>
            <span>Marcadores</span>
            <strong>Poisson + Dixon-Coles</strong>
            <p>
              Construye la matriz de goles con intensidades de ataque y defensa;
              Dixon-Coles ajusta la dependencia de marcadores bajos.
            </p>
          </article>
          <article>
            <span>Fuerza</span>
            <strong>Elo + forma reciente</strong>
            <p>
              La regresión logística compara Elo, puntos por partido y métricas
              de goles/xG de ataque y defensa disponibles.
            </p>
          </article>
          <article>
            <span>Incertidumbre</span>
            <strong>Monte Carlo</strong>
            <p>Simula resultados de gol a partir de las intensidades del modelo.</p>
          </article>
          <article>
            <span>Validación</span>
            <strong>Calibración histórica condicionada</strong>
            <p>
              Solo se aplica el ajuste cuando hay al menos 30 observaciones; de
              lo contrario, las probabilidades se muestran sin calibración.
            </p>
          </article>
        </div>
      </AnalysisSection>
    );
  }

  return (
    <AnalysisSection
      title="Fuentes · Evidencia"
      intro="Procedencia, hora y estado de evidencia utilizada para que el análisis sea reproducible."
    >
      <SourceLedger sources={analysis.sources} />
    </AnalysisSection>
  );
}
