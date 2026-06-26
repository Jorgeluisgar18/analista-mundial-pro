import { RefreshIcon, EditIcon, ExportIcon } from "@/components/analysis/Icons";

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
      <button type="button" onClick={onRefresh} aria-label="Actualizar datos del análisis"><RefreshIcon />Actualizar</button>
      <button type="button" onClick={onEdit} aria-label="Abrir panel de cambios manuales"><EditIcon />Ajustar</button>
      <button type="button" onClick={onExport} aria-label="Descargar informe en HTML"><ExportIcon />Descargar</button>
    </div>
  );
}
