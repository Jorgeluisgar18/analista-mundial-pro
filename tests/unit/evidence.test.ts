import { describe, expect, it } from "vitest";
import { resolveEvidence } from "@/lib/evidence/resolveEvidence";

describe("resolveEvidence", () => {
  it("prefiere la fuente oficial más reciente", () => {
    const result = resolveEvidence([
      {
        value: "4-3-3",
        status: "expected",
        sourceType: "provider",
        observedAt: "2026-06-25T10:00:00Z",
        source: "API-Football",
      },
      {
        value: "4-2-3-1",
        status: "confirmed",
        sourceType: "official",
        observedAt: "2026-06-25T11:00:00Z",
        source: "FIFA",
      },
    ]);
    expect(result.value).toBe("4-2-3-1");
    expect(result.status).toBe("confirmed");
  });

  it("marca conflicto entre fuentes oficiales recientes", () => {
    const result = resolveEvidence([
      {
        value: "4-3-3",
        status: "confirmed",
        sourceType: "official",
        observedAt: "2026-06-25T11:00:00Z",
        source: "FIFA",
      },
      {
        value: "4-4-2",
        status: "confirmed",
        sourceType: "official",
        observedAt: "2026-06-25T11:03:00Z",
        source: "Federación",
      },
    ]);
    expect(result.status).toBe("conflict");
  });
});
