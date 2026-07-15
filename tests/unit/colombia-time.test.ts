import { describe, expect, it } from "vitest";
import {
  APP_TIME_ZONE,
  formatDateInAppTimeZone,
  formatTimeInAppTimeZone,
  nextIsoDate,
  normalizeKickoffForAppTimeZone,
  todayInAppTimeZone,
} from "@/lib/time/colombia";

describe("horario Colombia", () => {
  it("clasifica un partido nocturno UTC dentro del día Colombia correcto", () => {
    const kickoff = normalizeKickoffForAppTimeZone("2026-06-16T02:30:00.000Z");

    expect(kickoff.date).toBe("2026-06-15");
    expect(kickoff.time).toBe("21:30");
    expect(kickoff.timezone).toBe(APP_TIME_ZONE);
    expect(kickoff.kickoff).toBe("2026-06-16T02:30:00.000Z");
  });

  it("formatea fecha y hora sin depender de la zona horaria del servidor", () => {
    expect(formatDateInAppTimeZone("2026-06-15T05:15:00.000Z")).toBe(
      "2026-06-15",
    );
    expect(formatTimeInAppTimeZone("2026-06-15T05:15:00.000Z")).toBe("00:15");
  });

  it("calcula la siguiente fecha ISO para ventanas UTC de respaldo", () => {
    expect(nextIsoDate("2026-06-15")).toBe("2026-06-16");
    expect(nextIsoDate("2026-12-31")).toBe("2027-01-01");
  });

  it("calcula la fecha actual en horario Colombia para valores por defecto", () => {
    expect(todayInAppTimeZone(new Date("2026-07-15T04:30:00.000Z"))).toBe(
      "2026-07-14",
    );
    expect(todayInAppTimeZone(new Date("2026-07-15T15:00:00.000Z"))).toBe(
      "2026-07-15",
    );
  });
});
