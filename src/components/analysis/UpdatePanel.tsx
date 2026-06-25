"use client";

import { useState } from "react";
import type { AnalysisResult, ManualOverrideInput } from "@/types/domain";

export function UpdatePanel({
  matchId,
  onClose,
  onUpdated,
}: {
  matchId: string;
  onClose: () => void;
  onUpdated: (analysis: AnalysisResult) => void;
}) {
  const [type, setType] =
    useState<ManualOverrideInput["type"]>("absence");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("Guardando y recalculando…");
    const response = await fetch(`/api/match/${matchId}/overrides`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, description, sourceUrl }),
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.detail ?? "No se pudo guardar el cambio.");
      return;
    }
    if (body.analysis) onUpdated(body.analysis);
    setStatus("Análisis actualizado manualmente");
  }

  return (
    <div className="drawer-backdrop" role="presentation">
      <aside className="update-drawer" aria-label="Panel de cambios manuales">
        <header>
          <div>
            <span className="section-kicker">Revisión humana</span>
            <h2>Cambios manuales</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </header>
        <p>
          Registra solo información comprobable. El cambio conserva hora,
          descripción y fuente antes de recalcular.
        </p>
        <form onSubmit={submit}>
          <label>
            <span>Tipo de cambio</span>
            <select value={type} onChange={(event) => setType(event.target.value as ManualOverrideInput["type"])}>
              <option value="absence">Nueva baja</option>
              <option value="starter">Cambio de titular</option>
              <option value="formation">Cambio de formación</option>
              <option value="referee">Cambio de árbitro</option>
              <option value="weather">Cambio climático</option>
              <option value="odds">Cambio de cuotas</option>
              <option value="suspension">Partido suspendido</option>
            </select>
          </label>
          <label>
            <span>Descripción del cambio</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              minLength={5}
              required
              rows={5}
              placeholder="Ej.: delantero titular descartado por molestias."
            />
          </label>
          <label>
            <span>URL de la fuente (opcional)</span>
            <input
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>
          <button className="primary-button" type="submit">
            Guardar y recalcular
          </button>
          {status ? <p className="drawer-status">{status}</p> : null}
        </form>
      </aside>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}
