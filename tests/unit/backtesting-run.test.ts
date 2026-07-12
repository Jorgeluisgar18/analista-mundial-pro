import { describe, expect, it } from "vitest";
import {
  backtestRowsToCalibration,
  deriveModelConfigFromBacktest,
  historicalMatchesToBacktestRows,
  outcomeFromScore,
  probabilitiesFromAnalysisResult,
} from "@/lib/backtesting/run";
import type { AnalysisResult } from "@/types/domain";

function analysisWithProbabilities(home: number, draw: number, away: number) {
  return {
    mainProbabilities: { home, draw, away },
  } as AnalysisResult;
}

describe("backtesting run helpers", () => {
  it("derives the 1X2 outcome from a final score", () => {
    expect(outcomeFromScore([2, 1])).toBe("home");
    expect(outcomeFromScore([1, 1])).toBe("draw");
    expect(outcomeFromScore([0, 3])).toBe("away");
  });

  it("normalizes AnalysisResult 1X2 percentages into probabilities", () => {
    expect(
      probabilitiesFromAnalysisResult(analysisWithProbabilities(46.2, 27.3, 26.5)),
    ).toEqual({
      home: 0.462,
      draw: 0.273,
      away: 0.265,
    });
  });

  it("builds a calibration summary from historical prediction rows", () => {
    const summary = backtestRowsToCalibration([
      {
        probabilities: { home: 0.5, draw: 0.25, away: 0.25 },
        outcome: "home",
      },
      {
        probabilities: { home: 0.25, draw: 0.25, away: 0.5 },
        outcome: "away",
      },
      {
        probabilities: { home: 0.34, draw: 0.33, away: 0.33 },
        outcome: "draw",
      },
    ]);

    expect(summary.sampleSize).toBe(3);
    expect(summary.empirical).toEqual({
      home: 1 / 3,
      draw: 1 / 3,
      away: 1 / 3,
    });
    expect(summary.brier).toBeGreaterThan(0);
    expect(summary.logLoss).toBeGreaterThan(0);
    expect(summary.rps).toBeGreaterThan(0);
  });

  it("creates offline backtest rows using only matches before the evaluated fixture", () => {
    const rows = historicalMatchesToBacktestRows([
      {
        id: "m1",
        kickoffDate: "2022-11-20",
        homeTeamId: "strong",
        homeTeamName: "Strong FC",
        awayTeamId: "weak",
        awayTeamName: "Weak FC",
        homeGoals: 3,
        awayGoals: 0,
      },
      {
        id: "m2",
        kickoffDate: "2022-11-24",
        homeTeamId: "strong",
        homeTeamName: "Strong FC",
        awayTeamId: "mid",
        awayTeamName: "Mid FC",
        homeGoals: 2,
        awayGoals: 0,
      },
      {
        id: "m3",
        kickoffDate: "2022-11-28",
        homeTeamId: "strong",
        homeTeamName: "Strong FC",
        awayTeamId: "weak",
        awayTeamName: "Weak FC",
        homeGoals: 1,
        awayGoals: 1,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.matchId).toBe("m3");
    expect(rows[0]?.outcome).toBe("draw");
    expect(rows[0]?.probabilities.home).toBeGreaterThan(
      rows[0]?.probabilities.away ?? 0,
    );
    expect(rows[0]?.probabilities.home).not.toBe(rows[0]?.probabilities.away);
  });

  it("deriva modelConfig versionado desde metricas reales de backtesting", () => {
    const summary = backtestRowsToCalibration([
      {
        probabilities: { home: 0.58, draw: 0.24, away: 0.18 },
        outcome: "home",
      },
      {
        probabilities: { home: 0.25, draw: 0.25, away: 0.5 },
        outcome: "away",
      },
      {
        probabilities: { home: 0.34, draw: 0.33, away: 0.33 },
        outcome: "draw",
      },
    ]);

    const config = deriveModelConfigFromBacktest(summary, {
      modelVersion: "1.1.0",
      source: "historicalMatch:rolling-offline",
    });

    expect(config.label).toContain("backtest-1.1.0");
    expect(config.weights.dixonColes).toBeGreaterThan(0);
    expect(config.weights.simulation).toBeGreaterThan(0);
    expect(config.weights.logistic).toBeGreaterThan(0);
    expect(
      config.weights.dixonColes +
        config.weights.simulation +
        config.weights.logistic,
    ).toBeCloseTo(1, 6);
  });
});
