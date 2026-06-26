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
        <div><dt>Portería a cero</dt><dd>{cleanSheet}%</dd></div>
        <div><dt>Paradas esperadas</dt><dd>{saves.toFixed(1)}</dd></div>
      </dl>
      <p>{risk}</p>
    </article>
  );
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
  const homeClean = Math.round(dataset.home.cleanSheetRate * 100);
  const awayClean = Math.round(dataset.away.cleanSheetRate * 100);
  return (
    <AnalysisSection
      title={`Porteros · ${subsection}`}
      intro="Proyección basada en volumen rival, tiros a puerta, calidad de ocasión y probabilidad de portería a cero."
    >
      <div className="keeper-comparison">
        <KeeperCard
          team={dataset.match.homeTeam.name}
          cleanSheet={homeClean}
          saves={Math.max(1.5, dataset.away.shotsOnTarget - analysis.expected.awayGoals)}
          risk={`${dataset.match.awayTeam.name} concentra más remates en zona central.`}
        />
        <div className="keeper-versus">VS</div>
        <KeeperCard
          team={dataset.match.awayTeam.name}
          cleanSheet={awayClean}
          saves={Math.max(1.5, dataset.home.shotsOnTarget - analysis.expected.homeGoals)}
          risk={`${dataset.match.homeTeam.name} puede producir ocasiones de alta calidad en transición.`}
        />
      </div>
    </AnalysisSection>
  );
}
