import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { demoDataset } from "@/data/demo";

afterEach(() => {
  vi.useRealTimers();
});

describe("probabilistic ensemble", () => {
  it("combina métodos y conserva una distribución 1X2 válida", () => {
    const result = analyzeMatch(demoDataset);
    const total =
      result.mainProbabilities.home +
      result.mainProbabilities.draw +
      result.mainProbabilities.away;
    expect(total).toBeCloseTo(100, 1);
    expect(result.modelVersion).toContain("ensemble");
  });

  it("calcula frescura real desde observedAt en vez de usar un valor fijo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

    const freshDataset = structuredClone(demoDataset);
    const staleDataset = structuredClone(demoDataset);

    freshDataset.sources = freshDataset.sources.map((source) => ({
      ...source,
      observedAt: "2026-06-15T11:30:00.000Z",
    }));
    staleDataset.sources = staleDataset.sources.map((source) => ({
      ...source,
      observedAt: "2026-06-12T12:00:00.000Z",
    }));

    const fresh = analyzeMatch(freshDataset);
    const stale = analyzeMatch(staleDataset);

    expect(fresh.dataQuality.freshness).toBeGreaterThan(stale.dataQuality.freshness);
    expect(stale.dataQuality.freshness).toBeLessThan(87);
    expect(fresh.expected.confidence).toBeGreaterThanOrEqual(
      stale.expected.confidence,
    );
  });

  it("calcula estabilidad del modelo desde CalibrationRun en vez de usar un literal fijo", () => {
    const stableDataset = structuredClone(demoDataset);
    const unstableDataset = structuredClone(demoDataset);

    stableDataset.historical = {
      calibration: {
        sampleSize: 240,
        brier: 0.34,
        logLoss: 0.82,
        rps: 0.1,
        empirical: { home: 0.48, draw: 0.27, away: 0.25 },
        confidenceMultiplier: 0.92,
      },
    };
    unstableDataset.historical = {
      calibration: {
        sampleSize: 35,
        brier: 0.78,
        logLoss: 1.55,
        rps: 0.42,
        empirical: { home: 0.48, draw: 0.27, away: 0.25 },
        confidenceMultiplier: 0.92,
      },
    };
    for (const dataset of [stableDataset, unstableDataset]) {
      dataset.lineups = dataset.lineups.map((lineup) => ({
        ...lineup,
        confirmed: true,
      }));
      dataset.sources = [
        ...dataset.sources,
        {
          id: "api-team-stats",
          label: "Proveedor · estadísticas de temporada",
          type: "provider",
          status: "inferred",
          observedAt: "2026-06-15T11:30:00.000Z",
          detail: "Conteos base disponibles para QA de estabilidad.",
        },
      ];
    }

    const stable = analyzeMatch(stableDataset);
    const unstable = analyzeMatch(unstableDataset);

    expect(stable.dataQuality.modelStability).toBeGreaterThan(
      unstable.dataQuality.modelStability,
    );
    expect(unstable.dataQuality.modelStability).not.toBe(82);
    expect(stable.expected.confidence).toBeGreaterThan(
      unstable.expected.confidence,
    );
  });
});
