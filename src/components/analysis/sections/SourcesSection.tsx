import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { SourceLedger } from "@/components/analysis/SourceLedger";
import type { AnalysisResult } from "@/types/domain";

function QualityBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}%</strong>
      <i><b style={{ width: `${value}%` }} /></i>
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
      <SourceLedger sources={analysis.sources} />
      <div className="methodology">
        <article>
          <span>Marcadores</span>
          <strong>Poisson + Dixon–Coles</strong>
          <p>Corrige dependencia de resultados bajos y genera la matriz completa.</p>
        </article>
        <article>
          <span>Fuerza</span>
          <strong>Elo contextual</strong>
          <p>Considera rival, sede, recencia y diferencia entre selecciones y clubes.</p>
        </article>
        <article>
          <span>Incertidumbre</span>
          <strong>Monte Carlo</strong>
          <p>Propaga variación de intensidades y escenarios de alineación.</p>
        </article>
        <article>
          <span>Validación</span>
          <strong>Calibración continua</strong>
          <p>Las probabilidades se evalúan contra resultados reales. Acertar el nivel de certeza importa más que acertar un resultado aislado.</p>
        </article>
      </div>
    </AnalysisSection>
  );
}
