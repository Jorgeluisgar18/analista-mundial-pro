import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { AlertIcon, ClockIcon } from "@/components/analysis/Icons";
import type { AnalysisResult, MatchDataset } from "@/types/domain";

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
      intro="Señales registradas en este análisis. No hay monitoreo en vivo; actualiza el informe manualmente para revisar novedades."
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
          <p className="empty-state">
            No hay alertas registradas en este análisis para «{subsection}». La
            aplicación no monitorea cambios en vivo; actualiza el análisis
            manualmente para revisar novedades.
          </p>
        )}
      </div>
    </AnalysisSection>
  );
}
