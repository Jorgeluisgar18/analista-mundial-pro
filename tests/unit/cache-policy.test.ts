import { describe, expect, it } from "vitest";
import {
  cacheDecision,
  refreshWindowFor,
} from "@/lib/cache/cachePolicy";

describe("cachePolicy", () => {
  it("usa una ventana corta para cuotas entre T-90 y T-15", () => {
    const kickoff = "2026-07-10T20:00:00.000Z";
    const now = new Date("2026-07-10T18:45:00.000Z");
    const observedAt = "2026-07-10T18:20:00.000Z";

    const decision = cacheDecision({
      resource: "odds",
      kickoff,
      observedAt,
      now,
    });

    expect(refreshWindowFor("odds", kickoff, now).ttlMinutes).toBe(15);
    expect(decision.shouldRefresh).toBe(true);
    expect(decision.reason).toMatch(/T-90/i);
  });

  it("mantiene alineaciones confirmadas como frescas hasta el inicio", () => {
    const decision = cacheDecision({
      resource: "lineups",
      kickoff: "2026-07-10T20:00:00.000Z",
      observedAt: "2026-07-10T18:55:00.000Z",
      now: new Date("2026-07-10T19:40:00.000Z"),
      confirmed: true,
    });

    expect(decision.shouldRefresh).toBe(false);
    expect(decision.ttlMinutes).toBe(90);
  });

  it("marca como vencido un recurso sin observación previa", () => {
    const decision = cacheDecision({
      resource: "weather",
      kickoff: "2026-07-10T20:00:00.000Z",
      now: new Date("2026-07-10T12:00:00.000Z"),
    });

    expect(decision.shouldRefresh).toBe(true);
    expect(decision.reason).toMatch(/sin snapshot/i);
  });
});
