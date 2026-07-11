import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourceLedger } from "@/components/analysis/SourceLedger";
import type { SourceRecord } from "@/types/domain";

function source(overrides: Partial<SourceRecord>): SourceRecord {
  return {
    id: "match-snapshot-cache-hit",
    label: "Cache",
    type: "provider",
    status: "inferred",
    observedAt: "2026-07-11T15:00:00.000Z",
    detail: "Snapshot reutilizado.",
    ...overrides,
  };
}

describe("SourceLedger", () => {
  it("renderiza fuentes con ids repetidos sin warning de keys duplicadas", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <SourceLedger
        sources={[
          source({ label: "Cache A" }),
          source({ label: "Cache B", detail: "Segundo snapshot reutilizado." }),
        ]}
      />,
    );

    expect(screen.getByText("Cache A")).toBeVisible();
    expect(screen.getByText("Cache B")).toBeVisible();
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("Encountered two children with the same key"),
      expect.anything(),
    );

    consoleError.mockRestore();
  });
});
