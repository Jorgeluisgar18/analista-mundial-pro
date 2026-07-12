import { describe, expect, it } from "vitest";
import { apiQuotaDecision } from "@/lib/providers/apiQuotaPolicy";

describe("apiQuotaDecision", () => {
  it("permite llamar si no hay telemetría previa", () => {
    expect(apiQuotaDecision(undefined, { reserve: 10 })).toMatchObject({
      shouldCall: true,
    });
  });

  it("bloquea llamadas cuando la reserva diaria quedaría comprometida", () => {
    expect(
      apiQuotaDecision(
        {
          provider: "API-Football",
          used: 91,
          limit: 100,
          period: "day",
          periodKey: "2026-06-26",
          resetsAt: "2026-06-27T00:00:00.000Z",
          updatedAt: "2026-06-26T12:00:00.000Z",
        },
        { reserve: 10, now: new Date("2026-06-26T12:00:00.000Z") },
      ),
    ).toMatchObject({
      shouldCall: false,
      remaining: 9,
    });
  });

  it("bloquea llamadas mensuales cuando una API reporta cuota mensual", () => {
    expect(
      apiQuotaDecision(
        {
          provider: "The Odds API",
          used: 480,
          limit: 500,
          period: "month",
          periodKey: "2026-07",
          resetsAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-07-01T12:00:00.000Z",
        },
        { reserve: 25, now: new Date("2026-07-01T12:00:00.000Z") },
      ),
    ).toMatchObject({
      shouldCall: false,
      remaining: 20,
    });
  });

  it("permite llamadas si queda margen por encima de la reserva", () => {
    expect(
      apiQuotaDecision(
        {
          provider: "API-Football",
          used: 30,
          limit: 100,
          period: "day",
          periodKey: "2026-06-26",
          resetsAt: "2026-06-27T00:00:00.000Z",
          updatedAt: "2026-06-26T12:00:00.000Z",
        },
        { reserve: 10, now: new Date("2026-06-26T12:00:00.000Z") },
      ),
    ).toMatchObject({
      shouldCall: true,
      remaining: 70,
    });
  });

  it("ignora contadores vencidos porque la ventana de cuota ya reinicio", () => {
    expect(
      apiQuotaDecision(
        {
          provider: "API-Football",
          used: 100,
          limit: 100,
          period: "day",
          periodKey: "2026-06-26",
          resetsAt: "2026-06-27T00:00:00.000Z",
          updatedAt: "2026-06-26T23:59:00.000Z",
        },
        {
          reserve: 10,
          now: new Date("2026-06-27T00:01:00.000Z"),
        },
      ),
    ).toMatchObject({
      shouldCall: true,
      remaining: 100,
    });
  });
});
