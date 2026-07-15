import { describe, expect, it, vi } from "vitest";
import {
  nextUsageValue,
  selectActiveUsageRecords,
} from "@/lib/services/apiUsageService";

vi.mock("server-only", () => ({}));

describe("selectActiveUsageRecords", () => {
  it("omite periodos vencidos y conserva el periodo vigente por proveedor", () => {
    const records = [
      {
        provider: "API-Football",
        periodKey: "2026-07-06",
        resetsAt: new Date("2026-07-07T00:00:00.000Z"),
        updatedAt: new Date("2026-07-06T18:00:00.000Z"),
      },
      {
        provider: "API-Football",
        periodKey: "2026-07-08",
        resetsAt: new Date("2026-07-09T00:00:00.000Z"),
        updatedAt: new Date("2026-07-08T15:00:00.000Z"),
      },
      {
        provider: "The Odds API",
        periodKey: "2026-07",
        resetsAt: new Date("2026-08-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-01T12:00:00.000Z"),
      },
    ];

    expect(
      selectActiveUsageRecords(
        records,
        new Date("2026-07-08T16:00:00.000Z"),
      ).map(({ provider, periodKey }) => ({ provider, periodKey })),
    ).toEqual([
      { provider: "API-Football", periodKey: "2026-07-08" },
      { provider: "The Odds API", periodKey: "2026-07" },
    ]);
  });
});

describe("nextUsageValue", () => {
  it("no permite que el contador retroceda cuando el proveedor reporta menos uso", () => {
    expect(nextUsageValue(10, 7)).toBe(10);
    expect(nextUsageValue(10, undefined)).toEqual({ increment: 1 });
    expect(nextUsageValue(10, 14)).toBe(14);
  });
});
