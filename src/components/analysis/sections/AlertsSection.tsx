import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { AlertIcon, ClockIcon } from "@/components/analysis/Icons";
import type { AnalysisResult } from "@/types/domain";

export function AlertsSection({
  analysis,
  subsection,
}: {
  analysis: AnalysisResult;
  subsection: string;
}) {
  return (
    <AnalysisSection
      title={`Alertas · ${subsection}`}
      intro="Eventos que obligan a revisar el modelo antes del inicio."
    >
      <div className="alerts-list">
        {analysis.alerts.map((alert) => (
          <article className={`alert-${alert.level}`} key={alert.title}>
            <AlertIcon />
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.detail}</p>
            </div>
          </article>
        ))}
        {[
          "Baja de último momento",
          "Cambio de arquero",
          "Cambio de formación",
          "Clima fuerte",
          "Movimiento brusco de cuotas",
          "Partido suspendido",
        ].map((title) => (
          <article className="alert-monitoring" key={title}>
            <ClockIcon />
            <div>
              <strong>{title}</strong>
              <p>Sin señal confirmada · monitoreo bajo demanda.</p>
            </div>
          </article>
        ))}
      </div>
    </AnalysisSection>
  );
}
