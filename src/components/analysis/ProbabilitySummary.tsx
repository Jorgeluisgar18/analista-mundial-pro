import type { AnalysisResult } from "@/types/domain";

export function ProbabilitySummary({
  analysis,
}: {
  analysis: AnalysisResult;
}) {
  const rows = [
    {
      label: analysis.match.homeTeam.name,
      value: analysis.mainProbabilities.home,
      tone: "home",
    },
    {
      label: "Empate",
      value: analysis.mainProbabilities.draw,
      tone: "draw",
    },
    {
      label: analysis.match.awayTeam.name,
      value: analysis.mainProbabilities.away,
      tone: "away",
    },
  ];
  return (
    <div className="probability-summary">
      {rows.map((row) => (
        <div className="probability-row" key={row.label}>
          <div>
            <span>{row.label}</span>
            <strong>{row.value.toFixed(1)}%</strong>
          </div>
          <div className="probability-track">
            <i
              className={`probability-fill probability-${row.tone}`}
              style={{ width: `${row.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
