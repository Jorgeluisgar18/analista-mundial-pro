import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { MarketTable } from "@/components/analysis/MarketTable";
import { MetricStrip } from "@/components/analysis/MetricStrip";
import { EditorialReading } from "@/components/analysis/EditorialReading";
import { ConfidenceBadge } from "@/components/analysis/ConfidenceBadge";
import type { AnalysisResult, Prediction } from "@/types/domain";

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

export function MarketsSection({
  analysis,
  subsection,
  onSelectPrediction,
}: {
  analysis: AnalysisResult;
  subsection: string;
  onSelectPrediction?: (prediction: Prediction) => void;
}) {
  const category = MARKET_CATEGORY[subsection] ?? "goals";
  const rows = analysis.predictions.filter(
    (p) => p.category === category,
  );
  return (
    <AnalysisSection
      title={`Mercado de ${subsection.toLowerCase()}`}
      intro="Distribución probabilística, cuota mínima, intervalo de incertidumbre y riesgos que pueden invalidar la lectura."
      aside={<ConfidenceBadge value={analysis.expected.confidence} />}
    >
      {subsection === "Goles" ? (
        <MetricStrip
          items={[
            ["Goles esperados", analysis.expected.goals],
            [`xG ${analysis.match.homeTeam.name}`, analysis.expected.homeGoals],
            [`xG ${analysis.match.awayTeam.name}`, analysis.expected.awayGoals],
            [
              "Ambos marcan",
              analysis.predictions.find(
                (p) => p.market === "Ambos equipos marcan",
              )?.probability ?? "No disponible",
              "%",
            ],
          ]}
        />
      ) : null}
      <div className="analysis-split">
        <MarketTable predictions={rows} onSelectPrediction={onSelectPrediction} />
        <EditorialReading analysis={analysis} subsection={subsection} />
      </div>
    </AnalysisSection>
  );
}
