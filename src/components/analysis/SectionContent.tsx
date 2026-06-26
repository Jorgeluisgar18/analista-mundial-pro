"use client";

import React from "react";
import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { MarketTable } from "@/components/analysis/MarketTable";
import { ProbabilitySummary } from "@/components/analysis/ProbabilitySummary";
import { SourceLedger } from "@/components/analysis/SourceLedger";
import { ConfidenceBadge } from "@/components/analysis/ConfidenceBadge";
import { MetricStrip } from "@/components/analysis/MetricStrip";
import { EditorialReading } from "@/components/analysis/EditorialReading";
import { AlertIcon, ClockIcon, GoalkeeperIcon } from "@/components/analysis/Icons";
import type { AnalysisResult, MatchDataset, Prediction } from "@/types/domain";

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

interface SectionContentProps {
  activeSection: string;
  activeSubsection: string;
  analysis: AnalysisResult;
  dataset: MatchDataset;
  onSelectPrediction?: (prediction: Prediction) => void;
}

export function SectionContent({
  activeSection,
  activeSubsection,
  analysis,
  dataset,
  onSelectPrediction,
}: SectionContentProps) {
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
          <MarketTable predictions={rows} onSelectPrediction={onSelectPrediction} />
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
          <MarketTable predictions={rows} onSelectPrediction={onSelectPrediction} />
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
