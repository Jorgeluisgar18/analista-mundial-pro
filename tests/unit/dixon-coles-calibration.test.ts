import { describe, expect, it } from "vitest";
import {
  calibrateDixonColesRho,
  DEFAULT_DIXON_COLES_RHO,
} from "@/lib/backtesting/dixon-coles-calibration";

describe("Dixon-Coles rho calibration", () => {
  it("selects the rho candidate with the best historical score likelihood", () => {
    const rows = [
      { homeGoals: 0, awayGoals: 0, homeLambda: 1.1, awayLambda: 1.05 },
      { homeGoals: 1, awayGoals: 1, homeLambda: 1.15, awayLambda: 1.1 },
      { homeGoals: 0, awayGoals: 0, homeLambda: 0.95, awayLambda: 1.0 },
      { homeGoals: 1, awayGoals: 1, homeLambda: 1.05, awayLambda: 1.2 },
    ];

    const calibration = calibrateDixonColesRho(rows, {
      candidates: [-0.14, -0.08, 0, 0.08],
      minSampleSize: 1,
    });

    expect(calibration.sampleSize).toBe(4);
    expect(calibration.rho).toBeLessThan(0);
    expect(calibration.candidates).toHaveLength(4);
    expect(calibration.averageLogLoss).toBeLessThan(
      calibration.candidates.find((candidate) => candidate.rho === 0)
        ?.averageLogLoss ?? Number.POSITIVE_INFINITY,
    );
  });

  it("falls back to the default rho when the sample is insufficient", () => {
    const calibration = calibrateDixonColesRho(
      [{ homeGoals: 2, awayGoals: 1, homeLambda: 1.4, awayLambda: 1.1 }],
      { minSampleSize: 5 },
    );

    expect(calibration.sampleSize).toBe(1);
    expect(calibration.rho).toBe(DEFAULT_DIXON_COLES_RHO);
    expect(calibration.applied).toBe(false);
  });
});
