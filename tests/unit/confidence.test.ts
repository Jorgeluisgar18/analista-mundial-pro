import { describe, expect, it } from "vitest";
import { calculateConfidence } from "@/lib/analysis/confidence";

describe("calculateConfidence", () => {
  it("limita la confianza cuando las alineaciones no están confirmadas", () => {
    const result = calculateConfidence({
      coverage: 0.92,
      freshness: 0.95,
      agreement: 0.9,
      modelStability: 0.92,
      calibration: 0.85,
      lineupConfirmed: false,
      hasBaseStats: true,
    });
    expect(result).toBeLessThanOrEqual(6);
  });

  it("limita la confianza a cuatro sin estadísticas base", () => {
    const result = calculateConfidence({
      coverage: 0.8,
      freshness: 0.8,
      agreement: 0.8,
      modelStability: 0.8,
      calibration: 0.8,
      lineupConfirmed: true,
      hasBaseStats: false,
    });
    expect(result).toBeLessThanOrEqual(4);
  });
});
