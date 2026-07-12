import { describe, expect, it } from "vitest";
import {
  canonicalHistoricalTeamName,
  adjustProbabilitiesWithCalibration,
  historicalFormFromMatches,
  summarizeCalibration,
} from "@/lib/historical/form";

describe("historical form and calibration", () => {
  it("normalizes provider national-team suffixes for historical matching", () => {
    expect(canonicalHistoricalTeamName("Spain National Team")).toBe("spain");
    expect(canonicalHistoricalTeamName("Tunisia National Football Team")).toBe(
      "tunisia",
    );
  });

  it("weights recent matches and opponent strength when deriving team form", () => {
    const form = historicalFormFromMatches(
      "Colombia",
      [
        {
          kickoffDate: "2026-06-01",
          homeTeamName: "Colombia",
          awayTeamName: "Brazil",
          homeGoals: 2,
          awayGoals: 1,
          opponentElo: 1820,
        },
        {
          kickoffDate: "2025-01-01",
          homeTeamName: "Argentina",
          awayTeamName: "Colombia",
          homeGoals: 3,
          awayGoals: 0,
          opponentElo: 1850,
        },
        {
          kickoffDate: "2026-05-01",
          homeTeamName: "Colombia",
          awayTeamName: "Panama",
          homeGoals: 1,
          awayGoals: 0,
          opponentElo: 1500,
        },
      ],
      new Date("2026-06-15T00:00:00Z"),
    );

    expect(form.matches).toBe(3);
    expect(form.weightedPointsPerGame).toBeGreaterThan(2);
    expect(form.strengthAdjustedPointsPerGame).toBeGreaterThan(
      form.weightedPointsPerGame,
    );
    expect(form.goalsFor).toBeGreaterThan(form.goalsAgainst);
  });

  it("expone splits local y visitante para evitar una forma historica plana", () => {
    const form = historicalFormFromMatches(
      "Colombia",
      [
        {
          kickoffDate: "2026-06-01",
          homeTeamName: "Colombia",
          awayTeamName: "Peru",
          homeGoals: 3,
          awayGoals: 0,
        },
        {
          kickoffDate: "2026-06-05",
          homeTeamName: "Ecuador",
          awayTeamName: "Colombia",
          homeGoals: 2,
          awayGoals: 0,
        },
      ],
      new Date("2026-06-15T00:00:00Z"),
    );

    expect(form.home.matches).toBe(1);
    expect(form.away.matches).toBe(1);
    expect(form.home.goalsFor).toBeGreaterThan(form.away.goalsFor);
    expect(form.home.weightedPointsPerGame).toBeGreaterThan(
      form.away.weightedPointsPerGame,
    );
  });

  it("summarizes calibration quality using Brier, log loss and RPS", () => {
    const summary = summarizeCalibration([
      {
        probabilities: { home: 0.55, draw: 0.25, away: 0.2 },
        outcome: "home",
      },
      {
        probabilities: { home: 0.3, draw: 0.3, away: 0.4 },
        outcome: "away",
      },
    ]);

    expect(summary.sampleSize).toBe(2);
    expect(summary.brier).toBeGreaterThan(0);
    expect(summary.logLoss).toBeGreaterThan(0);
    expect(summary.rps).toBeGreaterThan(0);
    expect(summary.confidenceMultiplier).toBeGreaterThan(0.8);
  });

  it("shrinks probabilities toward empirical rates when calibration has enough sample", () => {
    const adjusted = adjustProbabilitiesWithCalibration(
      { home: 0.7, draw: 0.18, away: 0.12 },
      {
        sampleSize: 80,
        brier: 0.74,
        logLoss: 1.25,
        rps: 0.22,
        empirical: { home: 0.52, draw: 0.27, away: 0.21 },
        confidenceMultiplier: 0.88,
      },
    );

    expect(adjusted.home).toBeLessThan(0.7);
    expect(adjusted.draw).toBeGreaterThan(0.18);
    expect(adjusted.home + adjusted.draw + adjusted.away).toBeCloseTo(1, 6);
  });
});
