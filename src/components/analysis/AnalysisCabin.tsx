"use client";

import Link from "next/link";
import { useState } from "react";
import { UpdatePanel } from "@/components/analysis/UpdatePanel";
import { ResponsibleGamingNotice } from "@/components/shared/ResponsibleGamingNotice";
import { formatTimestamp } from "@/lib/format/date";
import { MatchHero } from "@/components/analysis/MatchHero";
import { SectionContent } from "@/components/analysis/SectionContent";
import { MarketDetailDrawer } from "@/components/analysis/MarketDetailDrawer";
import {
  ChevronIcon,
  RefreshIcon,
  EditIcon,
  ExportIcon,
  ClockIcon,
} from "@/components/analysis/Icons";
import type {
  AnalysisResult,
  MatchDataset,
  Prediction,
} from "@/types/domain";

const NAVIGATION = [
  {
    id: "summary",
    label: "01 · Resumen",
    subs: ["Panorama", "Probabilidades", "Escenarios", "Confianza"],
  },
  {
    id: "context",
    label: "02 · Contexto",
    subs: ["Necesidad", "Forma reciente", "Rivales", "Motivación y presión"],
  },
  {
    id: "tactics",
    label: "03 · Táctica",
    subs: ["Formaciones", "Plan ofensivo", "Plan defensivo", "Duelos", "Ajustes 2T"],
  },
  {
    id: "squads",
    label: "04 · Plantillas",
    subs: ["Alineaciones", "Lesionados", "Suspendidos", "En duda", "Reemplazos"],
  },
  {
    id: "markets",
    label: "05 · Mercados",
    subs: [
      "Resultado y hándicap",
      "Marcador exacto",
      "Goles",
      "Corners",
      "Tarjetas",
      "Faltas",
      "Disparos",
      "Fueras de juego",
    ],
  },
  {
    id: "players",
    label: "06 · Jugadores",
    subs: ["Goleadores", "Asistencias", "Disparos", "Faltas", "Tarjetas"],
  },
  {
    id: "keepers",
    label: "07 · Porteros",
    subs: ["Proyección", "Paradas", "Portería a cero", "Riesgos"],
  },
  {
    id: "value",
    label: "08 · Valor y riesgo",
    subs: ["Conservador", "Moderado", "Arriesgado", "Solo observación", "Surebets"],
  },
  {
    id: "alerts",
    label: "09 · Alertas",
    subs: ["Prepartido", "Alineaciones", "Clima", "Árbitro", "Movimiento de cuotas"],
  },
  {
    id: "sources",
    label: "10 · Fuentes",
    subs: ["Evidencia", "Calidad", "Metodología", "Consumo API"],
  },
] as const;

type SectionId = (typeof NAVIGATION)[number]["id"];

export function AnalysisCabin({
  initialAnalysis,
  dataset,
}: {
  initialAnalysis: AnalysisResult;
  dataset: MatchDataset;
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [activeSection, setActiveSection] = useState<SectionId>("markets");
  const [activeSubsection, setActiveSubsection] = useState("Goles");
  const [updateOpen, setUpdateOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const currentNavigation = NAVIGATION.find(
    (section) => section.id === activeSection,
  )!;

  function selectSection(section: (typeof NAVIGATION)[number]) {
    setActiveSection(section.id);
    setActiveSubsection(section.id === "markets" ? "Goles" : section.subs[0]);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/match/${analysis.match.id}/refresh`, {
        method: "POST",
      });
      const body = await response.json();
      if (response.ok && body.analysis) setAnalysis(body.analysis);
    } finally {
      setRefreshing(false);
    }
  }

  function exportHtml() {
    window.location.assign(`/api/match/${analysis.match.id}/export`);
  }

  return (
    <div className="analysis-app">
      <header className="analysis-topbar">
        <Link className="brand brand-compact" href="/">
          <span>AMP</span>
          <i />
          <small>Analista<br />Mundial Pro</small>
        </Link>
        <div className="topbar-actions">
          <button className="secondary-button" onClick={exportHtml}>
            <ExportIcon /> Exportar HTML
          </button>
          <button
            className="secondary-button"
            onClick={() => setUpdateOpen(true)}
          >
            <EditIcon /> Cambios manuales
          </button>
          <button
            className="primary-button"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshIcon /> {refreshing ? "Actualizando…" : "Actualizar datos"}
          </button>
        </div>
      </header>

      <div className="analysis-layout">
        <aside className="analysis-sidebar" aria-label="Secciones del análisis">
          <span className="sidebar-title">Informe del partido</span>
          {NAVIGATION.map((section) => {
            const active = activeSection === section.id;
            return (
              <div className="sidebar-group" key={section.id}>
                <button
                  className={active ? "sidebar-button active" : "sidebar-button"}
                  onClick={() => selectSection(section)}
                  aria-expanded={active}
                >
                  <span>{section.label}</span>
                  <ChevronIcon open={active} />
                </button>
                {active ? (
                  <div className="sidebar-subnav">
                    {section.subs.map((subsection) => (
                      <button
                        className={
                          activeSubsection === subsection ? "selected" : ""
                        }
                        key={subsection}
                        onClick={() => setActiveSubsection(subsection)}
                      >
                        {subsection}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="sidebar-freshness">
            <ClockIcon />
            <span>
              Último snapshot
              <strong>{formatTimestamp(analysis.generatedAt)}</strong>
            </span>
          </div>
        </aside>

        <main className="analysis-main">
          <MatchHero analysis={analysis} />
          <nav className="mobile-section-rail" aria-label="Categorías">
            {NAVIGATION.map((section) => (
              <button
                key={section.id}
                className={activeSection === section.id ? "active" : ""}
                onClick={() => selectSection(section)}
              >
                {section.label.replace(/0\d · /, "")}
              </button>
            ))}
          </nav>
          <nav className="subsection-rail" aria-label="Subsecciones">
            {currentNavigation.subs.map((subsection) => (
              <button
                className={activeSubsection === subsection ? "active" : ""}
                key={subsection}
                aria-label={`Pestaña ${subsection}`}
                onClick={() => setActiveSubsection(subsection)}
              >
                {subsection}
              </button>
            ))}
          </nav>
          <div className="analysis-content">
            <SectionContent
              activeSection={activeSection}
              activeSubsection={activeSubsection}
              analysis={analysis}
              dataset={dataset}
              onSelectPrediction={(p) => setSelectedPrediction(p)}
            />
          </div>
        </main>
      </div>
      <footer className="analysis-footer">
        <ResponsibleGamingNotice />
        <span>
          Modelo {analysis.modelVersion} · Confianza{" "}
          {analysis.expected.confidence.toFixed(1)}/10
        </span>
      </footer>
      <div className="mobile-responsible">
        Análisis probabilístico · No garantiza resultados · Juega responsablemente
      </div>
      <div className="mobile-actionbar">
        <button onClick={refresh}><RefreshIcon />Actualizar</button>
        <button onClick={() => setUpdateOpen(true)}><EditIcon />Cambios</button>
        <button onClick={exportHtml}><ExportIcon />Exportar</button>
      </div>
      {updateOpen ? (
        <UpdatePanel
          matchId={analysis.match.id}
          teams={[
            analysis.match.homeTeam,
            analysis.match.awayTeam,
          ]}
          onClose={() => setUpdateOpen(false)}
          onUpdated={(updated) => setAnalysis(updated)}
        />
      ) : null}
      {selectedPrediction ? (
        <MarketDetailDrawer
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
          sources={analysis.sources}
        />
      ) : null}
    </div>
  );
}
