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
  return (
    <AnalysisSection
      title={`Fuentes · ${subsection}`}
      intro="Procedencia, hora, estado de evidencia y metodología utilizada para que el análisis sea reproducible."
    >
      <div className="quality-strip">
        <QualityBar label="Cobertura" value={analysis.dataQuality.coverage} />
        <QualityBar label="Frescura" value={analysis.dataQuality.freshness} />
        <QualityBar label="Acuerdo" value={analysis.dataQuality.agreement} />
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
              ? `${analysis.calibration.brier.toFixed(2)} · ${analysis.calibration.logLoss?.toFixed(2)} · ${analysis.calibration.rps?.toFixed(2)}`
              : "Pendiente"}
          </strong>
          <p>
            El porcentaje combina forma reciente, Poisson/Dixon-Coles, cuotas,
            alineaciones y calibración histórica cuando existe muestra en Neon.
          </p>
        </article>
      </div>

      <SourceLedger sources={analysis.sources} />

      <div className="methodology">
        <article>
          <span>Marcadores</span>
          <strong>Poisson + Dixon-Coles</strong>
          <p>Corrige dependencia de resultados bajos y genera la matriz completa.</p>
        </article>
        <article>
          <span>Fuerza</span>
          <strong>Forma contextual + histórico</strong>
          <p>
            Considera sede, recencia, forma ponderada, producción ofensiva y
            contexto disponible por tipo de competición.
          </p>
        </article>
        <article>
          <span>Incertidumbre</span>
          <strong>Monte Carlo</strong>
          <p>Propaga variación de intensidades y escenarios de alineación.</p>
        </article>
        <article>
          <span>Validación</span>
          <strong>Calibración continua</strong>
          <p>
            Las probabilidades se evalúan contra resultados reales con Brier,
            Log Loss y RPS. Acertar el nivel de certeza importa más que acertar
            un resultado aislado.
          </p>
        </article>
      </div>
    </AnalysisSection>
  );
}
