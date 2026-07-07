import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { AlertIcon, ClockIcon } from "@/components/analysis/Icons";
import type { AnalysisResult, MatchDataset } from "@/types/domain";

function monitoringItems(subsection: string) {
  if (subsection === "Alineaciones") {
    return ["Baja de último momento", "Cambio de arquero", "Cambio de formación"];
  }

  if (subsection === "Movimiento de cuotas") {
    return ["Movimiento brusco de cuotas", "Diferencia entre casas", "Caída de cuota favorita"];
  }

  return ["Baja de último momento", "Cambio de arquero", "Cambio de formación", "Clima fuerte", "Movimiento brusco de cuotas", "Partido suspendido"];
}

function filteredAlerts(analysis: AnalysisResult, subsection: string) {
  const needle = subsection.toLowerCase();

  if (subsection === "Prepartido") return analysis.alerts;

  return analysis.alerts.filter((alert) => {
    const text = `${alert.title} ${alert.detail}`.toLowerCase();
    return text.includes(needle);
  });
}

function EvidenceAlert({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <article className="alert-monitoring">
      <ClockIcon />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

export function AlertsSection({
  analysis,
  dataset,
  subsection,
}: {
  analysis: AnalysisResult;
  dataset: MatchDataset;
  subsection: string;
}) {
  const alerts = filteredAlerts(analysis, subsection);

  if (subsection === "Clima") {
    return (
      <AnalysisSection
        title="Alertas · Clima"
        intro="Condición climática y su impacto potencial sobre ritmo, precisión, corners y goles."
      >
        <div className="alerts-list">
          <EvidenceAlert
            title="Condición climática"
            detail={`${dataset.weather.value} · ${dataset.weather.status} · ${dataset.weather.source}`}
          />
        </div>
      </AnalysisSection>
    );
  }

  if (subsection === "Árbitro") {
    return (
      <AnalysisSection
        title="Alertas · Árbitro"
        intro="Señales del árbitro que pueden afectar tarjetas, faltas y ritmo del partido."
      >
        <div className="alerts-list">
          <EvidenceAlert
            title="Árbitro asignado"
            detail={`${dataset.referee.value} · ${dataset.referee.status} · ${dataset.referee.source}`}
          />
        </div>
      </AnalysisSection>
    );
  }

  return (
    <AnalysisSection
      title={`Alertas · ${subsection}`}
      intro="Eventos que obligan a revisar el modelo antes del inicio."
    >
      <div className="alerts-list">
        {alerts.length ? (
          alerts.map((alert) => (
            <article className={`alert-${alert.level}`} key={alert.title}>
              <AlertIcon />
              <div>
                <strong>{alert.title}</strong>
                <p>{alert.detail}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">No hay alertas activas para esta subsección.</p>
        )}
        {monitoringItems(subsection).map((title) => (
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
