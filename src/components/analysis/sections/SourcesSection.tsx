import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { SourceLedger } from "@/components/analysis/SourceLedger";
import type { AnalysisResult } from "@/types/domain";

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
  subsection,
}: {
  analysis: AnalysisResult;
  subsection: string;
}) {
  if (subsection === "Calidad") {
    return (
      <AnalysisSection
        title="Fuentes · Calidad"
        intro="Cobertura, frescura, acuerdo entre fuentes y estado de alineaciones para medir confiabilidad."
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
              suficiente o si debe tratarse como aproximacion preliminar.
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
              historico cuando existe muestra calibrada.
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
        intro="Métodos estadísticos usados para convertir datos de forma, cuotas, alineaciones y contexto en probabilidades."
      >
        <div className="methodology">
          <article>
            <span>Marcadores</span>
            <strong>Poisson + Dixon-Coles</strong>
            <p>
              Corrige dependencia de resultados bajos con rho calibrado y genera
              la matriz completa.
            </p>
          </article>
          <article>
            <span>Fuerza</span>
            <strong>Elo historico + forma contextual</strong>
            <p>
              Calcula ratings Elo desde resultados historicos cronologicos y los
              combina con sede, recencia, forma ponderada y produccion ofensiva
              disponible.
            </p>
          </article>
          <article>
            <span>Incertidumbre</span>
            <strong>Monte Carlo</strong>
            <p>Propaga variacion de intensidades y escenarios de alineacion.</p>
          </article>
          <article>
            <span>Validacion</span>
            <strong>Calibracion continua</strong>
            <p>
              Las probabilidades se evaluan contra resultados reales con Brier,
              Log Loss y RPS. Acertar el nivel de certeza importa mas que
              acertar un resultado aislado.
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
