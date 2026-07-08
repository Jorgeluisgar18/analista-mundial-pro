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
});
