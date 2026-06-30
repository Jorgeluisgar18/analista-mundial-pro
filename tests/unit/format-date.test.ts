import { describe, expect, it } from "vitest";
import { formatTimestamp } from "@/lib/format/date";

describe("formatTimestamp", () => {
  it("produce texto determinista en horario Colombia sin espacios no separables", () => {
    const result = formatTimestamp("2026-06-25T19:53:00.000Z");
    expect(result).toBe("25/06/2026 · 14:53 COT");
    expect(result).not.toContain("\u00a0");
  });
});
