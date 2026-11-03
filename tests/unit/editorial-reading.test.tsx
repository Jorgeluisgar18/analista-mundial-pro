import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EditorialReading } from "@/components/analysis/EditorialReading";
import type { AnalysisResult } from "@/types/domain";

afterEach(cleanup);

describe("EditorialReading", () => {
  it("does not present market data as a confirming signal without match odds", () => {
    const analysis = {
      match: {
        homeTeam: { name: "Chelsea" },
        awayTeam: { name: "Manchester United" },
      },
      expected: { goals: 2.4, homeGoals: 1.3, awayGoals: 1.1 },
      dataQuality: { lineupConfirmed: false },
    } as AnalysisResult;

    render(<EditorialReading analysis={analysis} subsection="Goles" />);

    expect(screen.getByText("Contexto del mercado")).toBeVisible();
    expect(
      screen.getByText(
        "La comparación con el mercado requiere cuotas disponibles para este partido; la proyección del modelo no las sustituye.",
      ),
    ).toBeVisible();
  });
});
