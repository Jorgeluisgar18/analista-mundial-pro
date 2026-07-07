"use client";

import { useEffect, useRef, useState } from "react";
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
  const [value, setValue] = useState("");
  const [analystToken, setAnalystToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem("amp-analyst-token") ?? ""),
  );
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const needsTeam = ["absence", "starter", "formation"].includes(type);
  const needsPlayer = ["absence", "starter"].includes(type);
  const needsImpact = ["absence", "starter"].includes(type);
  const needsValue = ["formation", "referee", "weather", "odds"].includes(
    type,
  );

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      );
    focusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const token = analystToken.trim();
    if (!token) {
      setStatus("Ingresa el token de analista antes de guardar cambios.");
      return;
    }
    setStatus("Guardando y recalculando…");
    setSaving(true);
    try {
      window.localStorage.setItem("amp-analyst-token", token);
      const response = await fetch(`/api/match/${matchId}/overrides`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-analyst-token": token,
        },
        body: JSON.stringify({
          type,
          description,
          sourceUrl,
          teamId: needsTeam ? teamId : undefined,
          player: needsPlayer ? player : undefined,
          impact: needsImpact ? impact : undefined,
          area: needsImpact ? area : undefined,
          value: needsValue ? value : undefined,
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
      <aside
        ref={dialogRef}
        className="update-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-update-title"
      >
        <header>
          <div>
            <span className="section-kicker">Revisión humana</span>
            <h2 id="manual-update-title">Cambios manuales</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </header>
        <p>
          Registra solo información comprobable. El cambio conserva hora,
          descripción y fuente antes de recalcular.
        </p>
        <form onSubmit={submit}>
          <label>
            <span>Token de analista</span>
            <input
              type="password"
              value={analystToken}
              onChange={(event) => setAnalystToken(event.target.value)}
              autoComplete="off"
              placeholder="Credencial privada de edición"
              required
            />
          </label>
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
          {needsTeam ? (
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
          ) : null}
          {needsPlayer ? (
            <>
              <label>
                <span>
                  {type === "starter" ? "Jugador confirmado" : "Jugador (opcional)"}
                </span>
                <input
                  value={player}
                  onChange={(event) => setPlayer(event.target.value)}
                  maxLength={120}
                  placeholder="Nombre del jugador"
                  required={type === "starter"}
                />
              </label>
            </>
          ) : null}
          {needsImpact ? (
            <>
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
          {needsValue ? (
            <label>
              <span>Valor específico</span>
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                maxLength={type === "odds" ? 4000 : 200}
                placeholder={
                  type === "formation"
                    ? "Ej.: 5-4-1"
                    : type === "odds"
                      ? "JSON de cuotas normalizadas"
                      : "Dato confirmado"
                }
              />
            </label>
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
