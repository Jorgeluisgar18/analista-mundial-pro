"use client";

import Link from "next/link";
import { useState } from "react";
import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { MarketTable } from "@/components/analysis/MarketTable";
import { ProbabilitySummary } from "@/components/analysis/ProbabilitySummary";
import { SourceLedger } from "@/components/analysis/SourceLedger";
import { UpdatePanel } from "@/components/analysis/UpdatePanel";
import { ResponsibleGamingNotice } from "@/components/shared/ResponsibleGamingNotice";
import { formatTimestamp } from "@/lib/format/date";
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

const MARKET_CATEGORY: Record<string, Prediction["category"]> = {
  "Resultado y hándicap": "result",
  "Marcador exacto": "score",
  Goles: "goals",
  Corners: "corners",
  Tarjetas: "cards",
  Faltas: "fouls",
  Disparos: "shots",
  "Fueras de juego": "offsides",
};

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
    </div>
  );
}

function MatchHero({ analysis }: { analysis: AnalysisResult }) {
  const match = analysis.match;
  return (
    <header className="match-hero">
      <div className="match-hero-light" />
      <span className="section-kicker">
        {match.competition.name} · {match.competition.stage}
      </span>
      <div className="match-versus">
        <div>
          <span className="team-flag">{match.homeTeam.flag ?? match.homeTeam.code}</span>
          <strong>{match.homeTeam.name}</strong>
        </div>
        <i>×</i>
        <div>
          <strong>{match.awayTeam.name}</strong>
          <span className="team-flag">{match.awayTeam.flag ?? match.awayTeam.code}</span>
        </div>
      </div>
      <p>
        {match.date} · {match.time} · {match.venue} ·{" "}
        {match.dataOrigin === "DEMO" ? "Datos demostrativos" : "Datos reales"}
      </p>
      <span className="match-status">Análisis preliminar</span>
      {analysis.manuallyUpdated ? (
        <span className="manual-update-label">
          Análisis actualizado manualmente
        </span>
      ) : null}
    </header>
  );
}

function SectionContent({
  activeSection,
  activeSubsection,
  analysis,
  dataset,
}: {
  activeSection: SectionId;
  activeSubsection: string;
  analysis: AnalysisResult;
  dataset: MatchDataset;
}) {
  if (activeSection === "markets") {
    const category = MARKET_CATEGORY[activeSubsection] ?? "goals";
    const rows = analysis.predictions.filter(
      (prediction) => prediction.category === category,
    );
    return (
      <AnalysisSection
        title={`Mercado de ${activeSubsection.toLowerCase()}`}
        intro="Distribución probabilística, cuota mínima, intervalo de incertidumbre y riesgos que pueden invalidar la lectura."
        aside={<ConfidenceBadge value={analysis.expected.confidence} />}
      >
        {activeSubsection === "Goles" ? (
          <MetricStrip
            items={[
              ["Goles esperados", analysis.expected.goals],
              [`xG ${analysis.match.homeTeam.name}`, analysis.expected.homeGoals],
              [`xG ${analysis.match.awayTeam.name}`, analysis.expected.awayGoals],
              [
                "Ambos marcan",
                analysis.predictions.find(
                  (prediction) =>
                    prediction.market === "Ambos equipos marcan",
                )?.probability ?? "N/D",
                "%",
              ],
            ]}
          />
        ) : null}
        <div className="analysis-split">
          <MarketTable predictions={rows} />
          <EditorialReading analysis={analysis} subsection={activeSubsection} />
        </div>
      </AnalysisSection>
    );
  }

  if (activeSection === "summary") {
    return (
      <AnalysisSection
        title="Lectura ejecutiva"
        intro={analysis.executiveSummary}
        aside={<ConfidenceBadge value={analysis.expected.confidence} />}
      >
        <div className="summary-grid">
          <div className="summary-probabilities">
            <ProbabilitySummary analysis={analysis} />
          </div>
          <div className="summary-signal">
            <span className="section-kicker">Señal principal</span>
            <strong>
              {analysis.match.awayTeam.name} genera más volumen;{" "}
              {analysis.match.homeTeam.name} conserva amenaza en transición.
            </strong>
            <p>
              La probabilidad no equivale a certeza. El modelo bajará su
              confianza si las alineaciones difieren de lo esperado.
            </p>
          </div>
        </div>
        <MetricStrip
          items={[
            ["Goles", analysis.expected.goals],
            ["Corners", analysis.expected.corners],
            ["Tarjetas", analysis.expected.cards],
            ["Cobertura", analysis.dataQuality.coverage, "%"],
          ]}
        />
        <div className="scenario-grid">
          {analysis.scenarios.map((scenario) => (
            <article key={scenario.title}>
              <span>{scenario.probability.toFixed(1)}%</span>
              <strong>{scenario.title}</strong>
              <p>{scenario.description}</p>
            </article>
          ))}
        </div>
      </AnalysisSection>
    );
  }

  if (activeSection === "context") {
    const contextRows = [
      [`Necesidad de ${dataset.match.homeTeam.name}`, dataset.context.homeNeed],
      [`Necesidad de ${dataset.match.awayTeam.name}`, dataset.context.awayNeed],
      ["Motivación local", dataset.context.homeMotivation],
      ["Motivación visitante", dataset.context.awayMotivation],
      ["Presión competitiva", dataset.context.pressure],
      [
        "Forma reciente",
        `${analysis.match.homeTeam.name}: ${dataset.home.recentPointsPerGame} pts/partido · ${analysis.match.awayTeam.name}: ${dataset.away.recentPointsPerGame} pts/partido`,
      ],
    ];
    return (
      <AnalysisSection
        title={`Contexto · ${activeSubsection}`}
        intro="Necesidad competitiva, forma ponderada por rival y condiciones que cambian el significado de las estadísticas."
      >
        <div className="detail-list">
          {contextRows.map(([title, detail]) => (
            <article key={title}>
              <span>Contexto</span>
              <strong>{title}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </AnalysisSection>
    );
  }

  if (activeSection === "tactics") {
    return (
      <AnalysisSection
        title={`Táctica · ${activeSubsection}`}
        intro={dataset.context.tacticalSummary}
      >
        <div className="formation-grid">
          {dataset.lineups.map((lineup) => {
            const team =
              lineup.teamId === dataset.match.homeTeam.id
                ? dataset.match.homeTeam
                : dataset.match.awayTeam;
            return (
              <article className="formation-card" key={lineup.teamId}>
                <span>{team.name}</span>
                <strong>{String(lineup.formation.value)}</strong>
                <small>
                  Alternativa {lineup.alternativeFormation} ·{" "}
                  {lineup.confirmed ? "Confirmada" : "Esperada"}
                </small>
                <div className="formation-lines" aria-hidden="true">
                  <i /><i /><i /><i />
                </div>
                <ul>
                  {lineup.starters.slice(0, 6).map((player) => (
                    <li key={player}>{player}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <div className="tactical-notes">
          <article>
            <span>Plan ofensivo</span>
            <p>
              {dataset.match.awayTeam.name} busca amplitud, fijación exterior y
              llegada del interior al área.
            </p>
          </article>
          <article>
            <span>Plan defensivo</span>
            <p>
              {dataset.match.homeTeam.name} protege el carril central y orienta
              la presión hacia banda.
            </p>
          </article>
          <article>
            <span>Duelo clave</span>
            <p>Luis Díaz frente al lateral adelantado: transición contra recuperación.</p>
          </article>
          <article>
            <span>Ajuste de segundo tiempo</span>
            <p>Un mediocampista adicional puede reducir ritmo si el marcador permanece cerrado.</p>
          </article>
        </div>
      </AnalysisSection>
    );
  }

  if (activeSection === "squads") {
    return (
      <AnalysisSection
        title={`Plantillas · ${activeSubsection}`}
        intro="Alineaciones esperadas o confirmadas, ausencias y efecto táctico de cada reemplazo."
      >
        <div className="lineup-columns">
          {dataset.lineups.map((lineup) => (
            <article key={lineup.teamId}>
              <span className="evidence-label">
                {lineup.confirmed ? "Confirmada" : "Esperada"}
              </span>
              <h3>
                {lineup.teamId === dataset.match.homeTeam.id
                  ? dataset.match.homeTeam.name
                  : dataset.match.awayTeam.name}{" "}
                · {String(lineup.formation.value)}
              </h3>
              <ol>
                {lineup.starters.map((player) => (
                  <li key={player}>{player}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
        <div className="availability-list">
          {dataset.availability.length ? (
            dataset.availability.map((item) => (
              <article key={item.id}>
                <span className={`availability-type availability-${item.type}`}>
                  {item.type}
                </span>
                <div>
                  <strong>{item.player}</strong>
                  <p>{item.impact}</p>
                  <small>Reemplazo probable: {item.replacement ?? "Dato no disponible"}</small>
                </div>
                <span>{item.evidence.status}</span>
              </article>
            ))
          ) : (
            <p className="empty-state">Dato no disponible en la fuente actual.</p>
          )}
        </div>
      </AnalysisSection>
    );
  }

  if (activeSection === "players") {
    const sortKey =
      activeSubsection === "Goleadores"
        ? "goalProbability"
        : activeSubsection === "Asistencias"
          ? "assistProbability"
          : activeSubsection === "Tarjetas"
            ? "cardProbability"
            : activeSubsection === "Faltas"
              ? "foulsCommitted"
              : "shots";
    const players = [...dataset.players].sort(
      (a, b) =>
        Number(b[sortKey as keyof typeof b] ?? 0) -
        Number(a[sortKey as keyof typeof a] ?? 0),
    );
    return (
      <AnalysisSection
        title={`Jugadores · ${activeSubsection}`}
        intro="Proyecciones condicionadas a titularidad, rol y minutos esperados. Si cambia el once, deben recalcularse."
      >
        <div className="player-ranking">
          {players.map((player, index) => (
            <article key={player.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{player.name}</strong>
                <small>{player.position} · {player.starterStatus}</small>
              </div>
              <dl>
                <div><dt>Gol</dt><dd>{Math.round((player.goalProbability ?? 0) * 100)}%</dd></div>
                <div><dt>Asistencia</dt><dd>{Math.round((player.assistProbability ?? 0) * 100)}%</dd></div>
                <div><dt>Tiros</dt><dd>{player.shots?.toFixed(1) ?? "N/D"}</dd></div>
                <div><dt>Tarjeta</dt><dd>{Math.round((player.cardProbability ?? 0) * 100)}%</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </AnalysisSection>
    );
  }

  if (activeSection === "keepers") {
    const homeClean = Math.round(dataset.home.cleanSheetRate * 100);
    const awayClean = Math.round(dataset.away.cleanSheetRate * 100);
    return (
      <AnalysisSection
        title={`Porteros · ${activeSubsection}`}
        intro="Proyección basada en volumen rival, tiros a puerta, calidad de ocasión y probabilidad de portería a cero."
      >
        <div className="keeper-comparison">
          <Keeper
            team={dataset.match.homeTeam.name}
            cleanSheet={homeClean}
            saves={Math.max(1.5, dataset.away.shotsOnTarget - analysis.expected.awayGoals)}
            risk={`${dataset.match.awayTeam.name} concentra más remates en zona central.`}
          />
          <div className="keeper-versus">VS</div>
          <Keeper
            team={dataset.match.awayTeam.name}
            cleanSheet={awayClean}
            saves={Math.max(1.5, dataset.home.shotsOnTarget - analysis.expected.homeGoals)}
            risk={`${dataset.match.homeTeam.name} puede producir ocasiones de alta calidad en transición.`}
          />
        </div>
      </AnalysisSection>
    );
  }

  if (activeSection === "value") {
    const tier =
      activeSubsection === "Surebets" ? null : activeSubsection;
    const rows =
      tier === null
        ? []
        : analysis.predictions
            .filter((prediction) => prediction.valueTier === tier)
            .slice(0, 10);
    return (
      <AnalysisSection
        title={`Valor y riesgo · ${activeSubsection}`}
        intro="El valor compara la probabilidad del modelo con la probabilidad implícita sin margen. No garantiza rentabilidad."
      >
        {activeSubsection === "Surebets" ? (
          <div className="surebet-panel">
            <span className="section-kicker">Comprobación aritmética</span>
            <h3>Σ (1 / mejor cuotaᵢ) &lt; 1</h3>
            {analysis.arbitrage.length ? (
              analysis.arbitrage.map((opportunity) => (
                <article key={opportunity.id}>
                  <strong>
                    {opportunity.market} · margen teórico{" "}
                    {(opportunity.margin * 100).toFixed(2)}%
                  </strong>
                  <ul>
                    {opportunity.outcomes.map((outcome) => (
                      <li key={outcome.outcome}>
                        {outcome.outcome}: {outcome.odd.toFixed(2)} en{" "}
                        {outcome.bookmaker} · asignación{" "}
                        {outcome.stake.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Beneficio teórico sobre {opportunity.bankroll.toFixed(2)}:{" "}
                    {opportunity.theoreticalProfit.toFixed(2)}.
                  </p>
                </article>
              ))
            ) : (
              <strong>
                No hay oportunidad aritmética en el snapshot actual.
              </strong>
            )}
            <p>
              La latencia, límites, comisiones, reglas y anulaciones pueden
              eliminar el margen observado.
            </p>
          </div>
        ) : rows.length ? (
          <MarketTable predictions={rows} />
        ) : (
          <div className="empty-state">
            Ningún mercado supera los filtros de esta categoría en el snapshot
            actual.
          </div>
        )}
      </AnalysisSection>
    );
  }

  if (activeSection === "alerts") {
    return (
      <AnalysisSection
        title={`Alertas · ${activeSubsection}`}
        intro="Eventos que obligan a revisar el modelo antes del inicio."
      >
        <div className="alerts-list">
          {analysis.alerts.map((alert) => (
            <article className={`alert-${alert.level}`} key={alert.title}>
              <AlertIcon />
              <div>
                <strong>{alert.title}</strong>
                <p>{alert.detail}</p>
              </div>
            </article>
          ))}
          {[
            "Baja de último momento",
            "Cambio de arquero",
            "Cambio de formación",
            "Clima fuerte",
            "Movimiento brusco de cuotas",
            "Partido suspendido",
          ].map((title) => (
            <article className="alert-monitoring" key={title}>
              <ClockIcon />
              <div>
                <strong>{title}</strong>
                <p>Sin señal confirmada · monitoreo bajo demanda.</p>
              </div>
            </article>
          ))}
        </div>
      </AnalysisSection>
    );
  }

  return (
    <AnalysisSection
      title={`Fuentes · ${activeSubsection}`}
      intro="Procedencia, hora, estado de evidencia y metodología utilizada para que el análisis sea reproducible."
    >
      <div className="quality-strip">
        <Quality label="Cobertura" value={analysis.dataQuality.coverage} />
        <Quality label="Frescura" value={analysis.dataQuality.freshness} />
        <Quality label="Acuerdo" value={analysis.dataQuality.agreement} />
        <Quality
          label="Alineaciones"
          value={analysis.dataQuality.lineupConfirmed ? 100 : 45}
        />
      </div>
      <SourceLedger sources={analysis.sources} />
      <div className="methodology">
        <article>
          <span>Marcadores</span>
          <strong>Poisson + Dixon–Coles</strong>
          <p>Corrige dependencia de resultados bajos y genera la matriz completa.</p>
        </article>
        <article>
          <span>Fuerza</span>
          <strong>Elo contextual</strong>
          <p>Considera rival, sede, recencia y diferencia entre selecciones y clubes.</p>
        </article>
        <article>
          <span>Incertidumbre</span>
          <strong>Monte Carlo</strong>
          <p>Propaga variación de intensidades y escenarios de alineación.</p>
        </article>
        <article>
          <span>Validación</span>
          <strong>Brier · Log loss · RPS</strong>
          <p>La calibración probabilística importa más que acertar un resultado aislado.</p>
        </article>
      </div>
    </AnalysisSection>
  );
}

function MetricStrip({
  items,
}: {
  items: Array<[string, string | number, string?]>;
}) {
  return (
    <div className="metric-strip">
      {items.map(([label, value, suffix]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>
            {typeof value === "number" ? value.toFixed(value % 1 ? 1 : 0) : value}
            {suffix}
          </strong>
        </div>
      ))}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  return (
    <div className="confidence-badge">
      <span>Confianza del modelo</span>
      <strong>{value.toFixed(1)}</strong>
      <small>/10</small>
    </div>
  );
}

function EditorialReading({
  analysis,
  subsection,
}: {
  analysis: AnalysisResult;
  subsection: string;
}) {
  return (
    <aside className="editorial-reading">
      <span className="section-kicker">Lectura del analista</span>
      <p>
        {subsection === "Goles"
          ? `El rango central se concentra entre dos y tres goles. ${analysis.match.awayTeam.name} aporta la mayor parte del volumen ofensivo, pero el escenario depende de cuánto tiempo ${analysis.match.homeTeam.name} sostenga su bloque medio.`
          : `La proyección combina volumen reciente, contexto y calidad del rival. El mercado ${subsection.toLowerCase()} conserva sensibilidad alta al primer gol y a las alineaciones.`}
      </p>
      <div className="signal reinforces">
        <TrendUpIcon />
        <div>
          <strong>Señal que refuerza</strong>
          <span>Producción reciente y ventaja de fuerza relativa.</span>
        </div>
      </div>
      <div className="signal weakens">
        <TrendDownIcon />
        <div>
          <strong>Señal que debilita</strong>
          <span>Alineaciones todavía esperadas y varianza del guion.</span>
        </div>
      </div>
    </aside>
  );
}

function Keeper({
  team,
  cleanSheet,
  saves,
  risk,
}: {
  team: string;
  cleanSheet: number;
  saves: number;
  risk: string;
}) {
  return (
    <article>
      <GoalkeeperIcon />
      <h3>{team}</h3>
      <dl>
        <div><dt>Portería a cero</dt><dd>{cleanSheet}%</dd></div>
        <div><dt>Paradas esperadas</dt><dd>{saves.toFixed(1)}</dd></div>
      </dl>
      <p>{risk}</p>
    </article>
  );
}

function Quality({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}%</strong>
      <i><b style={{ width: `${value}%` }} /></i>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={open ? "open" : ""}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function RefreshIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5M4 18v-5h5M6.1 8A7 7 0 0 1 18.7 6M17.9 16A7 7 0 0 1 5.3 18" /></svg>;
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10-10-3.2-3.2-10 10L4 20ZM13.8 7 17 10.2" /></svg>;
}

function ExportIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0-12 4 4m-4-4L8 7M5 13v7h14v-7" /></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

function AlertIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5m0 3h.01" /></svg>;
}

function TrendUpIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 5-5 4 4 7-8M15 7h5v5" /></svg>;
}

function TrendDownIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 5 5 4-4 7 8M15 17h5v-5" /></svg>;
}

function GoalkeeperIcon() {
  return <svg className="keeper-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M10 51V13h44v38M15 19h34M32 19v32M15 51c4-12 10-18 17-18s13 6 17 18" /></svg>;
}
