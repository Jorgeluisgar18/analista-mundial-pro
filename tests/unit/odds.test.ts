import { describe, expect, it } from "vitest";
import {
  detectArbitrage,
  expectedValue,
  removeOverround,
} from "@/lib/models/odds";

describe("odds math", () => {
  it("elimina el margen normalizando probabilidades implícitas", () => {
    const probabilities = removeOverround([2, 3.5, 4]);
    expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });

  it("calcula valor esperado decimal", () => {
    expect(expectedValue(0.6, 1.9)).toBeCloseTo(0.14, 8);
  });

  it("detecta arbitraje cuando la suma de inversas es menor que uno", () => {
    expect(detectArbitrage([2.12, 3.7, 4.4]).isOpportunity).toBe(true);
  });
});
