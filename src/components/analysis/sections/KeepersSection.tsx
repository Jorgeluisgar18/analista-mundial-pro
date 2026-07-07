import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { GoalkeeperIcon } from "@/components/analysis/Icons";
import type { AnalysisResult, MatchDataset } from "@/types/domain";

function KeeperCard({
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
        <div>
          <dt>Portería a cero</dt>
          <dd>{cleanSheet}%</dd>
        </div>
        <div>
          <dt>Paradas esperadas</dt>
          <dd>{saves.toFixed(1)}</dd>
        </div>
      </dl>
      <p>{risk}</p>
    </article>
  );
}

function keeperRisk({
  opponent,
  opponentShots,
  opponentShotsOnTarget,
  opponentGoals,
}: {
  opponent: string;
  opponentShots: number;
  opponentShotsOnTarget: number;
  opponentGoals: number;
}) {
  if (opponentShotsOnTarget >= 5 || opponentShots >= 15) {
    return `${opponent} concentra más remates y exige alta respuesta en tiros a puerta.`;
  }
  if (opponentGoals >= 1.5) {
    return `${opponent} no siempre acumula mucho volumen, pero sí proyecta calidad de ocasión suficiente para castigar errores.`;
  }
  return `${opponent} proyecta volumen controlado; el riesgo principal aparece en balón parado, transiciones aisladas o errores de salida.`;
}

function keeperMetrics({ analysis, dataset }: { analysis: AnalysisResult; dataset: MatchDataset }) {
  return {
    homeClean: Math.round(dataset.home.cleanSheetRate * 100),
    awayClean: Math.round(dataset.away.cleanSheetRate * 100),
    homeSaves: Math.max(1.5, dataset.away.shotsOnTarget - analysis.expected.awayGoals),
    awaySaves: Math.max(1.5, dataset.home.shotsOnTarget - analysis.expected.homeGoals),
    homeRisk: keeperRisk({
      opponent: dataset.match.awayTeam.name,
      opponentShots: dataset.away.shots,
      opponentShotsOnTarget: dataset.away.shotsOnTarget,
      opponentGoals: analysis.expected.awayGoals,
    }),
    awayRisk: keeperRisk({
      opponent: dataset.match.homeTeam.name,
      opponentShots: dataset.home.shots,
      opponentShotsOnTarget: dataset.home.shotsOnTarget,
      opponentGoals: analysis.expected.homeGoals,
    }),
  };
}

export function KeepersSection({
  analysis,
  dataset,
  subsection,
}: {
  analysis: AnalysisResult;
  dataset: MatchDataset;
  subsection: string;
}) {
  const metrics = keeperMetrics({ analysis, dataset });

  if (subsection === "Riesgos") {
    return (
      <AnalysisSection
        title="Porteros · Riesgos"
        intro="Mapa de riesgo del arquero: volumen rival, tiros a puerta y escenarios que pueden cambiar la lectura."
      >
        <div className="detail-list">
          <article>
            <span>Riesgo local</span>
            <strong>{dataset.match.homeTeam.name}</strong>
            <p>{metrics.homeRisk}</p>
          </article>
          <article>
            <span>Riesgo visitante</span>
            <strong>{dataset.match.awayTeam.name}</strong>
            <p>{metrics.awayRisk}</p>
          </article>
        </div>
      </AnalysisSection>
    );
  }

  if (subsection === "Paradas") {
    return (
      <AnalysisSection
        title="Porteros · Paradas"
        intro="Estimación de intervenciones según tiros a puerta concedidos y goles esperados del rival."
      >
        <div className="detail-list">
          <article>
            <span>Paradas esperadas</span>
            <strong>{dataset.match.homeTeam.name}</strong>
            <p>{metrics.homeSaves.toFixed(1)} paradas esperadas ante {dataset.match.awayTeam.name}.</p>
          </article>
          <article>
            <span>Paradas esperadas</span>
            <strong>{dataset.match.awayTeam.name}</strong>
            <p>{metrics.awaySaves.toFixed(1)} paradas esperadas ante {dataset.match.homeTeam.name}.</p>
          </article>
        </div>
      </AnalysisSection>
    );
  }

  if (subsection === "Portería a cero") {
    return (
      <AnalysisSection
        title="Porteros · Portería a cero"
        intro="Probabilidad defensiva base ajustada por forma reciente, producción rival y calidad de ocasión."
      >
        <div className="detail-list">
          <article>
            <span>Clean sheet</span>
            <strong>{dataset.match.homeTeam.name}</strong>
            <p>{metrics.homeClean}% de referencia prepartido.</p>
          </article>
          <article>
            <span>Clean sheet</span>
            <strong>{dataset.match.awayTeam.name}</strong>
            <p>{metrics.awayClean}% de referencia prepartido.</p>
          </article>
        </div>
      </AnalysisSection>
    );
  }

  return (
    <AnalysisSection
      title="Porteros · Proyección"
      intro="Proyección basada en volumen rival, tiros a puerta, calidad de ocasión y probabilidad de portería a cero."
    >
      <div className="keeper-comparison">
        <KeeperCard
          team={dataset.match.homeTeam.name}
          cleanSheet={metrics.homeClean}
          saves={metrics.homeSaves}
          risk={metrics.homeRisk}
        />
        <div className="keeper-versus">VS</div>
        <KeeperCard
          team={dataset.match.awayTeam.name}
          cleanSheet={metrics.awayClean}
          saves={metrics.awaySaves}
          risk={metrics.awayRisk}
        />
      </div>
    </AnalysisSection>
  );
}
