"use client";

import { useEffect, useRef } from "react";
import type { Prediction, SourceRecord } from "@/types/domain";
import { formatTimestamp } from "@/lib/format/date";

interface MarketDetailDrawerProps {
  prediction: Prediction;
  onClose: () => void;
  sources: SourceRecord[];
}

interface FormulaDetails {
  name: string;
  equation: string;
  desc: string;
}

export function MarketDetailDrawer({
  prediction,
  onClose,
  sources,
}: MarketDetailDrawerProps) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]',
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

  const availableOdd = prediction.availableOdd;
  const probability =
    prediction.probability !== undefined ? prediction.probability / 100 : undefined;
  const impliedProb = availableOdd ? 1 / availableOdd : undefined;
  const edge =
    probability !== undefined && impliedProb !== undefined
      ? probability - impliedProb
      : undefined;
  const ev = prediction.expectedValue;
  const formula = getFormulaDetails(prediction.category);
  const activeSources = sources.filter((source) =>
    prediction.sourceIds.includes(source.id),
  );

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={dialogRef}
        className="update-drawer market-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-detail-title"
      >
        <header>
          <div>
            <span className="section-kicker">Estadística y trazabilidad</span>
            <h2 id="market-detail-title">{prediction.market}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="detail-drawer-content">
          <section className="drawer-card drawer-card-probability">
            <h3 className="drawer-card-title">
              Desglose de Probabilidades y Valor
            </h3>
            <div className="drawer-metric-grid">
              <DrawerMetric
                label="Probabilidad modelo"
                value={
                  prediction.probability !== undefined
                    ? `${prediction.probability.toFixed(1)}%`
                    : "—"
                }
                tone="emerald"
                note={
                  prediction.interval
                    ? `Intervalo: ${prediction.interval[0].toFixed(0)}% - ${prediction.interval[1].toFixed(0)}%`
                    : undefined
                }
              />
              <DrawerMetric
                label="Probabilidad implicita"
                value={
                  impliedProb !== undefined
                    ? `${(impliedProb * 100).toFixed(1)}%`
                    : "—"
                }
                tone="muted"
                note={
                  availableOdd
                    ? `Cuota disponible: ${availableOdd.toFixed(2)}`
                    : undefined
                }
              />
            </div>

            <div className="drawer-metric-grid drawer-metric-grid-separated">
              <DrawerMetric
                label="Ventaja (edge)"
                value={
                  edge !== undefined
                    ? `${edge > 0 ? "+" : ""}${(edge * 100).toFixed(1)} pp`
                    : "Sin cuota"
                }
                tone={edge !== undefined && edge > 0 ? "emerald" : "muted"}
                compact
              />
              <DrawerMetric
                label="Valor esperado (EV)"
                value={
                  ev !== undefined
                    ? `${ev > 0 ? "+" : ""}${ev.toFixed(1)}%`
                    : "Sin valor"
                }
                tone={ev !== undefined && ev > 0 ? "amber" : "muted"}
                compact
              />
            </div>

            {prediction.minimumOddForValue ? (
              <p className="drawer-note">
                Requiere una cuota mayor a{" "}
                <strong>{prediction.minimumOddForValue.toFixed(2)}</strong>{" "}
                para considerarse una opcion de valor matematico.
              </p>
            ) : null}
          </section>

          <section className="drawer-card drawer-card-formula">
            <span className="drawer-card-kicker">Modelo Matemático</span>
            <h4>{formula.name}</h4>
            <code>{formula.equation}</code>
            <p>{formula.desc}</p>
          </section>

          <section className="drawer-card drawer-card-risk">
            <span className="drawer-card-kicker">Factores de riesgo</span>
            <h4>Sensibilidad del mercado</h4>
            <p>{prediction.risk}</p>
            <small>
              Los eventos del futbol real como expulsiones tempranas, goles
              accidentales o cambios imprevistos de planteamiento no pueden ser
              anticipados en su totalidad por distribuciones estocasticas.
            </small>
          </section>

          <section className="drawer-card">
            <h3 className="drawer-card-title">
              Evidencia y trazabilidad de fuentes
            </h3>
            {activeSources.length ? (
              <div className="drawer-source-list">
                {activeSources.map((source) => (
                  <div key={source.id} className="drawer-source-row">
                    <div>
                      <strong>{source.label}</strong>
                      <span>{source.detail}</span>
                    </div>
                    <div className="drawer-source-status">
                      <span
                        className={`evidence-dot evidence-dot-${source.status}`}
                        aria-hidden="true"
                      />
                      <span>{source.status}</span>
                      <small>{formatTimestamp(source.observedAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="drawer-empty-note">
                No se encontraron registros de fuentes explicitos para este
                mercado.
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function DrawerMetric({
  label,
  value,
  note,
  tone,
  compact = false,
}: {
  label: string;
  value: string;
  note?: string;
  tone: "emerald" | "amber" | "muted";
  compact?: boolean;
}) {
  return (
    <div className="drawer-metric">
      <span>{label}</span>
      <strong className={`drawer-metric-value drawer-metric-value-${tone} ${compact ? "drawer-metric-value-compact" : ""}`}>
        {value}
      </strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function getFormulaDetails(category: Prediction["category"]): FormulaDetails {
  switch (category) {
    case "result":
      return {
        name: "Ensamble ponderado 1X2",
        equation:
          "P = calibrar(0.60 * DixonColes + 0.20 * MonteCarlo + 0.20 * RegresionLogistica)",
        desc: "Combina matriz de goles Dixon-Coles, simulaciones Monte Carlo, regresion logistica y calibracion historica cuando existe muestra suficiente.",
      };
    case "score":
      return {
        name: "Matriz conjunta Dixon-Coles",
        equation: "P(H, A) = tau(H, A, rho) * Poisson(H, lambda) * Poisson(A, mu)",
        desc: "Calcula la probabilidad exacta del marcador con dos intensidades de gol y correccion para marcadores bajos.",
      };
    case "goals":
      return {
        name: "Masa de Probabilidad Dixon-Coles",
        equation: "P(Mas/Menos) = suma P(h, a) dentro del rango del mercado",
        desc: "Agrega las celdas de la matriz Dixon-Coles que corresponden al rango del mercado seleccionado.",
      };
    case "corners":
      return {
        name: "Poisson de corners",
        equation: "P(k) = (e^(-lambda) * lambda^k) / k!",
        desc: "Proyecta tiros de esquina desde volumen ofensivo, amplitud y estadisticas recientes de corners.",
      };
    case "cards":
      return {
        name: "Poisson de tarjetas y disciplina",
        equation: "P(k) = (e^(-lambda) * lambda^k) / k!",
        desc: "Modela amonestaciones con disciplina historica, tension competitiva y rigurosidad arbitral.",
      };
    case "fouls":
      return {
        name: "Poisson de infracciones",
        equation: "P(k) = (e^(-lambda) * lambda^k) / k!",
        desc: "Proyecta faltas desde duelos, presion defensiva y patron fisico del partido.",
      };
    case "shots":
      return {
        name: "Poisson de remates y eficacia",
        equation: "P(k) = (e^(-lambda) * lambda^k) / k!",
        desc: "Estima remates desde control esperado, transiciones ofensivas y tiros concedidos por el rival.",
      };
    case "offsides":
      return {
        name: "Poisson de fueras de juego",
        equation: "P(k) = (e^(-lambda) * lambda^k) / k!",
        desc: "Ajusta la tasa por altura defensiva rival, velocidad de desmarque y tendencia tactica.",
      };
    case "players":
      return {
        name: "Distribucion condicionada por minutos",
        equation: "P(Accion) = P(Accion | Minutos >= 60) * P(Titularidad)",
        desc: "Escala rendimiento individual por minutos esperados y probabilidad de titularidad.",
      };
    default:
      return {
        name: "Distribucion de probabilidad basica",
        equation: "P(k) = f(estadisticas)",
        desc: "Modelo simplificado basado en promedios historicos condicionados al contexto disponible.",
      };
  }
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}
