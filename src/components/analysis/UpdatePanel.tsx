"use client";

import { useState } from "react";
import type {
  AnalysisResult,
  ManualOverrideArea,
  ManualOverrideImpact,
  ManualOverrideInput,
  TeamRef,
} from "@/types/domain";

export function UpdatePanel({
  matchId,
  teams,
  onClose,
  onUpdated,
}: {
  matchId: string;
  teams: TeamRef[];
  onClose: () => void;
  onUpdated: (analysis: AnalysisResult) => void;
}) {
  const [type, setType] =
    useState<ManualOverrideInput["type"]>("absence");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [player, setPlayer] = useState("");
  const [impact, setImpact] = useState<ManualOverrideImpact>("medium");
  const [area, setArea] = useState<ManualOverrideArea>("attack");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("Guardando y recalculando…");
    setSaving(true);
    try {
      const response = await fetch(`/api/match/${matchId}/overrides`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          description,
          sourceUrl,
          teamId: type === "absence" ? teamId : undefined,
          player: type === "absence" ? player : undefined,
          impact: type === "absence" ? impact : undefined,
          area: type === "absence" ? area : undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setStatus(body.detail ?? "No se pudo guardar el cambio.");
        return;
      }
      if (body.analysis) onUpdated(body.analysis);
      setStatus("Análisis actualizado manualmente");
    } catch {
      setStatus("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
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
          {type === "absence" ? (
            <>
              <label>
                <span>Equipo afectado</span>
                <select
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  required
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Jugador (opcional)</span>
                <input
                  value={player}
                  onChange={(event) => setPlayer(event.target.value)}
                  maxLength={120}
                  placeholder="Nombre del jugador"
                />
              </label>
              <label>
                <span>Área afectada</span>
                <select
                  value={area}
                  onChange={(event) =>
                    setArea(event.target.value as ManualOverrideArea)
                  }
                >
                  <option value="attack">Ataque</option>
                  <option value="defense">Defensa</option>
                  <option value="balanced">Impacto mixto</option>
                </select>
              </label>
              <label>
                <span>Impacto estimado</span>
                <select
                  value={impact}
                  onChange={(event) =>
                    setImpact(event.target.value as ManualOverrideImpact)
                  }
                >
                  <option value="low">Bajo</option>
                  <option value="medium">Medio</option>
                  <option value="high">Alto</option>
                </select>
              </label>
            </>
          ) : null}
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
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Recalculando…" : "Guardar y recalcular"}
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
