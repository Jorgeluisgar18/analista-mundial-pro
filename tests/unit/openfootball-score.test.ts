import { describe, expect, it } from "vitest";
import { normalizeOpenFootballScore } from "@/lib/openfootball/score";

describe("normalizeOpenFootballScore", () => {
  it("normalizes tuple scores", () => {
    expect(normalizeOpenFootballScore([2, 1])).toEqual({
      fullTime: [2, 1],
      halfTime: undefined,
    });
  });

  it("normalizes object scores", () => {
    expect(normalizeOpenFootballScore({ ft: [3, 0], ht: [1, 0] })).toEqual({
      fullTime: [3, 0],
      halfTime: [1, 0],
    });
  });

  it("keeps future fixtures scoreless", () => {
    expect(normalizeOpenFootballScore(undefined)).toEqual({
      fullTime: undefined,
      halfTime: undefined,
    });
  });
});
