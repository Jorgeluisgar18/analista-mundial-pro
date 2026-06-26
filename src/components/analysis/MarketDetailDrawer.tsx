"use client";

import { useEffect, useRef } from "react";
import type { Prediction, SourceRecord } from "@/types/domain";
import { formatTimestamp } from "@/lib/format/date";

interface MarketDetailDrawerProps {
  prediction: Prediction;
  onClose: () => void;
  sources: SourceRecord[];
}

export function MarketDetailDrawer({
  prediction,
  onClose,
  sources,
}: MarketDetailDrawerProps) {
  const dialogRef = useRef<HTMLElement>(null);

  // Cierre con Escape y Trampa de Foco
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

  // Cálculos de cuotas y ventaja (Edge)
  const availableOdd = prediction.availableOdd;
  const probability = prediction.probability !== undefined ? prediction.probability / 100 : undefined;
  const impliedProb = availableOdd ? 1 / availableOdd : undefined;
  const edge = probability !== undefined && impliedProb !== undefined ? probability - impliedProb : undefined;
  const ev = prediction.expectedValue;

  // Selección de Fórmula Explicada por Categoría
  function getFormulaDetails(category: Prediction["category"]) {
    switch (category) {
      case "result":
        return {
          name: "Ensamble Ponderado 1X2",
          equation: "P = 0.60 · DixonColes + 0.20 · MonteCarlo + 0.20 · RegresiónLogística",
          desc: "Combina la matriz de goles Dixon-Coles, 12,000 simulaciones estocásticas de Monte Carlo y un modelo de regresión logística basado en el histórico Elo, puntos recientes de forma y balance de xG local/visitante.",
        };
      case "score":
        return {
          name: "Matriz Conjunta Dixon-Coles",
          equation: "P(H, A) = τ(H, A, ρ) · Poisson(H, λ) · Poisson(A, μ)",
          desc: "Calcula la probabilidad exacta del marcador mediante dos distribuciones de Poisson independientes (con intensidades λ y μ), aplicando la corrección paramétrica de Dixon-Coles (τ) para ajustar la interdependencia en marcadores bajos (0-0, 1-0, 0-1, 1-1).",
        };
      case "goals":
        return {
          name: "Masa de Probabilidad Dixon-Coles",
          equation: "P(Más/Menos) = Σ_{h + a ∈ Rango} P(h, a)",
          desc: "Determina la probabilidad agregando todas las celdas individuales de la matriz Dixon-Coles que corresponden al rango del mercado seleccionado (ej. la suma de todas las celdas donde h + a > 2.5 para el Más de 2.5 goles).",
        };
      case "corners":
        return {
          name: "Poisson de Corners",
          equation: "P(k) = (e^{-λ} · λ^k) / k!",
          desc: "Distribución de Poisson basada en la tasa esperada (λ) de tiros de esquina, proyectada a partir del volumen de ataque, tiros promedio, amplitud de juego por las bandas y estadísticas de corners concedidos/ganados recientemente.",
        };
      case "cards":
        return {
          name: "Poisson de Tarjetas y Disciplina",
          equation: "P(k) = (e^{-λ} · λ^k) / k!",
          desc: "Distribución de Poisson basada en la intensidad de amonestaciones (λ), calculada mediante el promedio histórico de tarjetas de ambos equipos, la tensión competitiva del partido y la rigurosidad estadística del árbitro asignado.",
        };
      case "fouls":
        return {
          name: "Poisson de Infracciones",
          equation: "P(k) = (e^{-λ} · λ^k) / k!",
          desc: "Distribución de Poisson basada en la intensidad de faltas (λ), proyectada según el volumen de duelos terrestres, presión defensiva tras pérdida y el promedio de amonestaciones físicas registradas en el torneo.",
        };
      case "shots":
        return {
          name: "Poisson de Remates y Eficacia",
          equation: "P(k) = (e^{-λ} · λ^k) / k!",
          desc: "Distribución de Poisson basada en la tasa proyectada de remates (λ), derivada del porcentaje de control de posesión esperado, la efectividad de transiciones ofensivas y la cantidad de disparos recibidos por la defensa rival.",
        };
      case "offsides":
        return {
          name: "Poisson de Fueras de Juego",
          equation: "P(k) = (e^{-λ} · λ^k) / k!",
          desc: "Distribución de Poisson con tasa media (λ) influida directamente por la altura de la línea defensiva del oponente (bloques altos/bajos), la velocidad de desmarque de los atacantes y la tendencia táctica de achique de espacios.",
        };
      case "players":
        return {
          name: "Distribución Condicionada por Minutos",
          equation: "P(Acción) = P(Acción | Minutos ≥ 60) · P(Titularidad)",
          desc: "Proyección individual de rendimiento escalada por los minutos efectivos estimados de juego y la probabilidad matemática de que el futbolista inicie en el once titular oficial.",
        };
      default:
        return {
          name: "Distribución de Probabilidad Básica",
          equation: "P(k) = f(Estadísticas)",
          desc: "Modelo estadístico simplificado basado en el promedio histórico del mercado condicionado al contexto de sede del encuentro.",
        };
    }
  }

  const formula = getFormulaDetails(prediction.category);

  // Filtrado de fuentes de evidencia asociadas a los datos de este mercado
  const activeSources = sources.filter((source) =>
    prediction.sourceIds.includes(source.id)
  );

  return (
    <div className="drawer-backdrop" role="presentation" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <aside
        ref={dialogRef}
        className="update-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-detail-title"
      >
        <header>
          <div>
            <span className="section-kicker">Estadística y Trazabilidad</span>
            <h2 id="market-detail-title">{prediction.market}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </header>

        <div className="detail-drawer-content" style={{ marginTop: "24px", display: "grid", gap: "24px" }}>
          
          {/* Tarjeta de Probabilidades y Edge */}
          <section className="drawer-card" style={{ background: "#0a1f24", padding: "18px", border: "1px solid var(--line-strong)" }}>
            <h3 style={{ fontFamily: "var(--font-ui)", fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "14px" }}>
              Desglose de Probabilidades y Valor
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <span style={{ display: "block", fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Probabilidad Modelo</span>
                <strong style={{ display: "block", fontSize: "28px", color: "var(--emerald)", fontWeight: "900", marginTop: "4px" }}>
                  {prediction.probability !== undefined ? `${prediction.probability.toFixed(1)}%` : "N/D"}
                </strong>
                {prediction.interval && (
                  <span style={{ fontSize: "10px", color: "var(--muted-2)" }}>
                    Intervalo: {prediction.interval[0].toFixed(0)}% – {prediction.interval[1].toFixed(0)}%
                  </span>
                )}
              </div>
              <div>
                <span style={{ display: "block", fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Probabilidad Implícita</span>
                <strong style={{ display: "block", fontSize: "28px", color: "#78928b", fontWeight: "900", marginTop: "4px" }}>
                  {impliedProb !== undefined ? `${(impliedProb * 100).toFixed(1)}%` : "—"}
                </strong>
                {availableOdd && (
                  <span style={{ fontSize: "10px", color: "var(--muted-2)" }}>
                    Cuota disponible: {availableOdd.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--line)", marginTop: "16px", paddingTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <span style={{ display: "block", fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Ventaja (Edge)</span>
                <strong style={{ display: "block", fontSize: "16px", color: edge !== undefined && edge > 0 ? "var(--emerald)" : "var(--muted)", marginTop: "2px" }}>
                  {edge !== undefined ? `${edge > 0 ? "+" : ""}${(edge * 100).toFixed(1)} pp` : "Sin cuota"}
                </strong>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Valor Esperado (EV)</span>
                <strong style={{ display: "block", fontSize: "16px", color: ev !== undefined && ev > 0 ? "var(--amber)" : "var(--muted)", marginTop: "2px" }}>
                  {ev !== undefined ? `${ev > 0 ? "+" : ""}${ev.toFixed(1)}%` : "Sin valor"}
                </strong>
              </div>
            </div>
            {prediction.minimumOddForValue && (
              <p style={{ marginTop: "12px", fontSize: "10px", color: "var(--muted-2)", fontStyle: "italic" }}>
                * Requiere una cuota mayor a <strong>{prediction.minimumOddForValue.toFixed(2)}</strong> para considerarse una opción de valor matemático.
              </p>
            )}
          </section>

          {/* Tarjeta de la Fórmula Matemática */}
          <section className="drawer-card" style={{ background: "#0e211e", padding: "18px", border: "1px solid var(--line-strong)", borderLeft: "3px solid var(--emerald)" }}>
            <span style={{ display: "block", fontSize: "9px", color: "var(--emerald)", textTransform: "uppercase", fontWeight: "bold" }}>
              Modelo Matemático
            </span>
            <h4 style={{ fontFamily: "var(--font-ui)", fontSize: "15px", marginTop: "6px", fontWeight: "800" }}>{formula.name}</h4>
            <code style={{ display: "block", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "4px", fontSize: "11px", marginBlock: "12px", color: "var(--emerald-soft)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {formula.equation}
            </code>
            <p style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.5", fontFamily: "var(--font-copy)" }}>
              {formula.desc}
            </p>
          </section>

          {/* Tarjeta de Riesgos e Incertidumbre */}
          <section className="drawer-card" style={{ background: "#1a0f0f", padding: "18px", border: "1px solid var(--line-strong)", borderLeft: "3px solid var(--coral)" }}>
            <span style={{ display: "block", fontSize: "9px", color: "var(--coral)", textTransform: "uppercase", fontWeight: "bold" }}>
              Factores de Riesgo
            </span>
            <h4 style={{ fontFamily: "var(--font-ui)", fontSize: "13px", marginTop: "6px", fontWeight: "800", textTransform: "uppercase", color: "#ffc1c1" }}>
              Sensibilidad del Mercado
            </h4>
            <p style={{ fontSize: "11px", color: "#f2cccc", lineHeight: "1.5", marginTop: "6px", fontFamily: "var(--font-copy)" }}>
              {prediction.risk}
            </p>
            <p style={{ fontSize: "10px", color: "var(--muted-2)", marginTop: "10px", lineHeight: "1.4" }}>
              * Los eventos del fútbol real como expulsiones tempranas, goles accidentales o cambios imprevistos de planteamiento no pueden ser anticipados en su totalidad por distribuciones estocásticas.
            </p>
          </section>

          {/* Orígenes de Evidencia */}
          <section className="drawer-card">
            <h3 style={{ fontFamily: "var(--font-ui)", fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", marginBottom: "10px" }}>
              Evidencia y Trazabilidad de Fuentes
            </h3>
            {activeSources.length ? (
              <div style={{ display: "grid", gap: "10px" }}>
                {activeSources.map((source) => (
                  <div key={source.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)", borderRadius: "4px" }}>
                    <div>
                      <strong style={{ fontSize: "11px", display: "block", textTransform: "uppercase" }}>{source.label}</strong>
                      <span style={{ fontSize: "9px", color: "var(--muted-2)" }}>{source.detail}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`evidence-dot`} style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", marginRight: "6px", background: source.status === "confirmed" ? "var(--emerald)" : source.status === "conflict" ? "var(--coral)" : "var(--amber)" }} />
                      <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "bold", color: source.status === "confirmed" ? "var(--emerald)" : "var(--amber)" }}>
                        {source.status}
                      </span>
                      <small style={{ display: "block", fontSize: "8px", color: "var(--muted-2)", marginTop: "2px" }}>
                        {formatTimestamp(source.observedAt)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "11px", color: "var(--muted)", fontStyle: "italic" }}>No se encontraron registros de fuentes explícitos para este mercado.</p>
            )}
          </section>
        </div>
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
