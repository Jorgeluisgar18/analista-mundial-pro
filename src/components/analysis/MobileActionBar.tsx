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
      <button onClick={onRefresh}><RefreshIcon />Actualizar</button>
      <button onClick={onEdit}><EditIcon />Ajustar</button>
      <button onClick={onExport}><ExportIcon />Descargar</button>
    </div>
  );
}
