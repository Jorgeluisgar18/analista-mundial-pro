import { describe, expect, it } from "vitest";
import { createMatchService } from "@/lib/services/matchService";

describe("matchService", () => {
  it("usa demo claramente etiquetado cuando no hay claves", async () => {
    const service = createMatchService({ env: {} });
    const result = await service.listByDate("2026-06-15");
    expect(result.mode).toBe("demo");
    expect(result.matches[0]?.dataOrigin).toBe("DEMO");
  });

  it("devuelve vacío para una fecha demo sin partidos", async () => {
    const service = createMatchService({ env: {} });
    const result = await service.listByDate("2026-07-01");
    expect(result.matches).toEqual([]);
  });
});
