import Link from "next/link";
import { RefreshIcon, EditIcon, ExportIcon, ClockIcon } from "@/components/analysis/Icons";

export function MobileActionBar({
  onRefresh,
  onEdit,
  onExport,
}: {
  onRefresh: () => void;
  onEdit: () => void;
  onExport: () => void;
}) {
  return (
    <div className="mobile-actionbar">
      <button type="button" onClick={onRefresh} aria-label="Actualizar datos del análisis">
        <RefreshIcon />
        Actualizar
      </button>
      <Link href="/#partidos" aria-label="Volver al buscador de partidos">
        <ClockIcon />
        Partidos
      </Link>
      <button type="button" onClick={onEdit} aria-label="Abrir panel de cambios manuales">
        <EditIcon />
        Ajustar
      </button>
      <button type="button" onClick={onExport} aria-label="Descargar informe en HTML">
        <ExportIcon />
        Descargar
      </button>
    </div>
  );
}
