import { SummarySection } from "@/components/analysis/sections/SummarySection";
import { ContextSection } from "@/components/analysis/sections/ContextSection";
import { TacticsSection } from "@/components/analysis/sections/TacticsSection";
import { SquadsSection } from "@/components/analysis/sections/SquadsSection";
import { MarketsSection } from "@/components/analysis/sections/MarketsSection";
import { PlayersSection } from "@/components/analysis/sections/PlayersSection";
import { KeepersSection } from "@/components/analysis/sections/KeepersSection";
import { ValueSection } from "@/components/analysis/sections/ValueSection";
import { AlertsSection } from "@/components/analysis/sections/AlertsSection";
import { SourcesSection } from "@/components/analysis/sections/SourcesSection";
import type { AnalysisResult, MatchDataset, Prediction } from "@/types/domain";

export function SectionContent({
  activeSection,
  activeSubsection,
  analysis,
  dataset,
  onSelectPrediction,
}: {
  activeSection: string;
  activeSubsection: string;
  analysis: AnalysisResult;
  dataset: MatchDataset;
  onSelectPrediction?: (prediction: Prediction) => void;
}) {
  switch (activeSection) {
    case "markets":
      return <MarketsSection analysis={analysis} subsection={activeSubsection} onSelectPrediction={onSelectPrediction} />;
    case "summary":
      return <SummarySection analysis={analysis} subsection={activeSubsection} />;
    case "context":
      return <ContextSection analysis={analysis} dataset={dataset} subsection={activeSubsection} />;
    case "tactics":
      return <TacticsSection dataset={dataset} subsection={activeSubsection} />;
    case "squads":
      return <SquadsSection dataset={dataset} subsection={activeSubsection} />;
    case "players":
      return <PlayersSection dataset={dataset} subsection={activeSubsection} />;
    case "keepers":
      return <KeepersSection analysis={analysis} dataset={dataset} subsection={activeSubsection} />;
    case "value":
      return <ValueSection analysis={analysis} subsection={activeSubsection} onSelectPrediction={onSelectPrediction} />;
    case "alerts":
      return <AlertsSection analysis={analysis} dataset={dataset} subsection={activeSubsection} />;
    default:
      return <SourcesSection analysis={analysis} subsection={activeSubsection} />;
  }
}
