import Link from "next/link";
import { ExportIcon, EditIcon, RefreshIcon } from "@/components/analysis/Icons";

export function AnalysisTopbar({
  onRefresh,
  onEdit,
  onExport,
  refreshing,
}: {
  onRefresh: () => void;
  onEdit: () => void;
  onExport: () => void;
  refreshing: boolean;
}) {
  return (
    <header className="analysis-topbar">
      <Link className="brand brand-compact" href="/">
        <span>AMP</span>
        <i />
        <small>Analista<br />Mundial Pro</small>
      </Link>
      <div className="topbar-actions">
        <button className="secondary-button" onClick={onExport}>
          <ExportIcon /> Descargar informe
        </button>
        <button className="secondary-button" onClick={onEdit}>
          <EditIcon /> Cambios manuales
        </button>
        <button className="primary-button" onClick={onRefresh} disabled={refreshing}>
          <RefreshIcon /> {refreshing ? "Actualizando…" : "Actualizar datos"}
        </button>
      </div>
    </header>
  );
}
