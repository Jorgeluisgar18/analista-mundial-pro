import { summarizeCalibration, type CalibrationRow } from "@/lib/historical/form";
import type { AnalysisResult } from "@/types/domain";

export type BacktestOutcome = "home" | "draw" | "away";
export type BacktestProbabilities = Record<BacktestOutcome, number>;

export interface HistoricalBacktestMatch {
  id: string;
  kickoffDate: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
}

export interface HistoricalBacktestRow extends CalibrationRow {
  matchId: string;
  kickoffDate: string;
  homeTeamName: string;
  awayTeamName: string;
}

export function outcomeFromScore(score: [number, number]): BacktestOutcome {
  const [home, away] = score;
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

export function probabilitiesFromAnalysisResult(
  analysis: Pick<AnalysisResult, "mainProbabilities">,
): BacktestProbabilities {
  const home = analysis.mainProbabilities.home / 100;
  const draw = analysis.mainProbabilities.draw / 100;
  const away = analysis.mainProbabilities.away / 100;
  const total = home + draw + away;
  return {
    home: home / total,
    draw: draw / total,
    away: away / total,
  };
}

export function backtestRowsToCalibration(rows: CalibrationRow[]) {
  return summarizeCalibration(rows);
}

function points(goalsFor: number, goalsAgainst: number) {
  if (goalsFor > goalsAgainst) return 3;
  if (goalsFor === goalsAgainst) return 1;
  return 0;
}

function teamSignal(
  teamId: string,
  matches: HistoricalBacktestMatch[],
  referenceDate: string,
) {
  const reference = new Date(`${referenceDate}T00:00:00Z`);
  const rows = matches
    .filter((match) => match.kickoffDate < referenceDate)
    .map((match) => {
      const isHome = match.homeTeamId === teamId;
      const isAway = match.awayTeamId === teamId;
      if (!isHome && !isAway) return undefined;
      const goalsFor = isHome ? match.homeGoals : match.awayGoals;
      const goalsAgainst = isHome ? match.awayGoals : match.homeGoals;
      const matchDate = new Date(`${match.kickoffDate}T00:00:00Z`);
      const days = Number.isNaN(matchDate.getTime())
        ? 365
        : Math.max(0, (reference.getTime() - matchDate.getTime()) / 86_400_000);
      const weight = Math.exp(-days / 730);
      return {
        goalsFor,
        goalsAgainst,
        points: points(goalsFor, goalsAgainst),
        weight,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const weightTotal = Math.max(
    0.0001,
    rows.reduce((sum, row) => sum + row.weight, 0),
  );

  return {
    matches: rows.length,
    ppg:
      rows.reduce((sum, row) => sum + row.points * row.weight, 0) / weightTotal,
    goalsFor:
      rows.reduce((sum, row) => sum + row.goalsFor * row.weight, 0) /
      weightTotal,
    goalsAgainst:
      rows.reduce((sum, row) => sum + row.goalsAgainst * row.weight, 0) /
      weightTotal,
  };
}

function normalizeProbabilities(
  probabilities: BacktestProbabilities,
): BacktestProbabilities {
  const total = probabilities.home + probabilities.draw + probabilities.away;
  return {
    home: probabilities.home / total,
    draw: probabilities.draw / total,
    away: probabilities.away / total,
  };
}

function probabilitiesFromSignals({
  home,
  away,
}: {
  home: ReturnType<typeof teamSignal>;
  away: ReturnType<typeof teamSignal>;
}): BacktestProbabilities {
  const ppgDelta = (home.ppg - away.ppg) / 3;
  const attackDelta = (home.goalsFor - away.goalsFor) / 3;
  const defenceDelta = (away.goalsAgainst - home.goalsAgainst) / 3;
  const strength = ppgDelta * 0.5 + attackDelta * 0.28 + defenceDelta * 0.22;
  const homeRaw = Math.exp(0.18 + strength);
  const awayRaw = Math.exp(-strength);
  const drawRaw = Math.exp(0.05 - Math.min(0.9, Math.abs(strength)) * 0.45);
  return normalizeProbabilities({
    home: homeRaw,
    draw: drawRaw,
    away: awayRaw,
  });
}

export function historicalMatchesToBacktestRows(
  matches: HistoricalBacktestMatch[],
  options: { minPriorMatchesPerTeam?: number } = {},
): HistoricalBacktestRow[] {
  const minPriorMatchesPerTeam = options.minPriorMatchesPerTeam ?? 1;
  const sorted = [...matches].sort((a, b) =>
    a.kickoffDate === b.kickoffDate
      ? a.id.localeCompare(b.id)
      : a.kickoffDate.localeCompare(b.kickoffDate),
  );

  return sorted.flatMap((match) => {
    const prior = sorted.filter((candidate) => candidate.kickoffDate < match.kickoffDate);
    const home = teamSignal(match.homeTeamId, prior, match.kickoffDate);
    const away = teamSignal(match.awayTeamId, prior, match.kickoffDate);
    if (
      home.matches < minPriorMatchesPerTeam ||
      away.matches < minPriorMatchesPerTeam
    ) {
      return [];
    }

    return [
      {
        matchId: match.id,
        kickoffDate: match.kickoffDate,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        probabilities: probabilitiesFromSignals({ home, away }),
        outcome: outcomeFromScore([match.homeGoals, match.awayGoals]),
      },
    ];
  });
}
