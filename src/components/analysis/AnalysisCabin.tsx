"use client";

import { useState } from "react";
import { UpdatePanel } from "@/components/analysis/UpdatePanel";
import { MarketDetailDrawer } from "@/components/analysis/MarketDetailDrawer";
import { MatchHero } from "@/components/analysis/MatchHero";
import { SectionContent } from "@/components/analysis/SectionContent";
import { AnalysisTopbar } from "@/components/analysis/AnalysisTopbar";
import { AnalysisSidebar, type NavSection } from "@/components/analysis/AnalysisSidebar";
import { MobileActionBar } from "@/components/analysis/MobileActionBar";
import { ResponsibleGamingNotice } from "@/components/shared/ResponsibleGamingNotice";
import type { AnalysisResult, MatchDataset, Prediction } from "@/types/domain";

const NAVIGATION: readonly NavSection[] = [
  { id: "summary", label: "01 · Resumen", subs: ["Panorama", "Probabilidades", "Escenarios", "Confianza"] },
  { id: "context", label: "02 · Contexto", subs: ["Necesidad", "Forma reciente", "Rivales", "Motivación y presión"] },
  { id: "tactics", label: "03 · Táctica", subs: ["Formaciones", "Plan ofensivo", "Plan defensivo", "Duelos", "Ajustes 2T"] },
  { id: "squads", label: "04 · Plantillas", subs: ["Alineaciones", "Lesionados", "Suspendidos", "En duda", "Reemplazos"] },
  { id: "markets", label: "05 · Mercados", subs: ["Resultado y hándicap", "Marcador exacto", "Goles", "Corners", "Tarjetas", "Faltas", "Disparos", "Fueras de juego"] },
  { id: "players", label: "06 · Jugadores", subs: ["Goleadores", "Asistencias", "Disparos", "Faltas", "Tarjetas"] },
  { id: "keepers", label: "07 · Porteros", subs: ["Proyección", "Paradas", "Portería a cero", "Riesgos"] },
  { id: "value", label: "08 · Valor y riesgo", subs: ["Conservador", "Moderado", "Arriesgado", "Solo observación", "Surebets"] },
  { id: "alerts", label: "09 · Alertas", subs: ["Prepartido", "Alineaciones", "Clima", "Árbitro", "Movimiento de cuotas"] },
  { id: "sources", label: "10 · Fuentes", subs: ["Evidencia", "Calidad", "Metodología"] },
];

export function AnalysisCabin({
  initialAnalysis,
  dataset,
}: {
  initialAnalysis: AnalysisResult;
  dataset: MatchDataset;
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [activeSection, setActiveSection] = useState<string>("markets");
  const [activeSubsection, setActiveSubsection] = useState("Goles");
  const [updateOpen, setUpdateOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const currentNavigation = NAVIGATION.find((s) => s.id === activeSection) ?? NAVIGATION[0];

  function selectSection(section: NavSection) {
    setActiveSection(section.id);
    setActiveSubsection(section.id === "markets" ? "Goles" : section.subs[0]);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/match/${analysis.match.id}/refresh`, { method: "POST" });
      const body = await res.json();
      if (res.ok && body.analysis) setAnalysis(body.analysis);
    } finally {
      setRefreshing(false);
    }
  }

  function exportHtml() {
    window.location.assign(`/api/match/${analysis.match.id}/export`);
  }

  return (
    <div className="analysis-app">
      <AnalysisTopbar onRefresh={refresh} onEdit={() => setUpdateOpen(true)} onExport={exportHtml} refreshing={refreshing} />

      <div className="analysis-layout">
        <AnalysisSidebar
          navigation={NAVIGATION}
          activeSection={activeSection}
          activeSubsection={activeSubsection}
          analysis={analysis}
          onSelectSection={selectSection}
          onSelectSubsection={setActiveSubsection}
        />

        <main className="analysis-main">
          <MatchHero analysis={analysis} />
          <nav className="mobile-section-rail" aria-label="Categorías">
            {NAVIGATION.map((section) => (
              <button
                type="button"
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
                type="button"
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
      </footer>
      <div className="mobile-responsible">
        Análisis probabilístico · No garantiza resultados · Juega responsablemente
      </div>
      <MobileActionBar onRefresh={refresh} onEdit={() => setUpdateOpen(true)} onExport={exportHtml} />

      {updateOpen ? (
        <UpdatePanel
          matchId={analysis.match.id}
          teams={[analysis.match.homeTeam, analysis.match.awayTeam]}
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


