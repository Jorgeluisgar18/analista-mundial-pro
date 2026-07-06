import { describe, expect, it } from "vitest";
import { brierScore, logLoss, rankedProbabilityScore } from "@/lib/backtesting/metrics";

describe("backtesting metrics", () => {
  it("computes Brier score for a three-way football market", () => {
    expect(
      brierScore({ home: 0.5, draw: 0.25, away: 0.25 }, "home"),
    ).toBeCloseTo(0.375);
  });

  it("keeps log loss finite with probability clipping", () => {
    expect(logLoss({ home: 0, draw: 0.4, away: 0.6 }, "home")).toBeLessThan(
      20,
    );
  });

  it("computes ranked probability score for ordered 1X2 outcomes", () => {
    expect(
      rankedProbabilityScore({ home: 0.6, draw: 0.25, away: 0.15 }, "draw"),
    ).toBeCloseTo(0.19125, 5);
  });
});
