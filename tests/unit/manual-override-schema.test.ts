import { describe, expect, it } from "vitest";
import { manualOverrideSchema } from "@/lib/validation/schemas";

describe("manualOverrideSchema", () => {
  it("exige equipo y valor para cambios de formación", () => {
    const result = manualOverrideSchema.safeParse({
      type: "formation",
      description: "Cambio táctico confirmado.",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["teamId", "value"]),
      );
    }
  });

  it("exige equipo e impacto para cambio de titular", () => {
    const result = manualOverrideSchema.safeParse({
      type: "starter",
      description: "Nuevo titular ofensivo confirmado.",
      player: "Delantero sorpresa",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["teamId", "impact", "area"]),
      );
    }
  });

  it("acepta árbitro y clima con valor confirmado", () => {
    expect(
      manualOverrideSchema.safeParse({
        type: "referee",
        description: "Árbitro confirmado por la organización.",
        value: "Árbitro estricto",
      }).success,
    ).toBe(true);
    expect(
      manualOverrideSchema.safeParse({
        type: "weather",
        description: "Clima actualizado por fuente meteorológica.",
        value: "Lluvia fuerte",
      }).success,
    ).toBe(true);
  });

  it("acepta snapshots JSON largos para cuotas manuales", () => {
    const odds = Array.from({ length: 5 }, (_, index) => ({
      bookmaker: `Casa ${index}`,
      market: "h2h",
      outcome: `Resultado ${index}`,
      odd: 2 + index * 0.1,
      observedAt: "2026-06-25T18:30:00.000Z",
    }));

    expect(
      manualOverrideSchema.safeParse({
        type: "odds",
        description: "Snapshot manual de cuotas comparadas.",
        value: JSON.stringify(odds),
      }).success,
    ).toBe(true);
  });
});
