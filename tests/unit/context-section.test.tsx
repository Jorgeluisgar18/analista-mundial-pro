import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContextSection } from "@/components/analysis/sections/ContextSection";
import { demoDataset } from "@/data/demo";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";

afterEach(cleanup);

describe("ContextSection", () => {
  it("muestra evidencia histórica y fuerza del rival en forma reciente", () => {
    const dataset = structuredClone(demoDataset);
    dataset.historical = {
      homeForm: {
        matches: 8,
        weightedPointsPerGame: 1.88,
        strengthAdjustedPointsPerGame: 1.71,
        goalsFor: 1.5,
        goalsAgainst: 0.9,
        cleanSheetRate: 0.38,
        source: "historical",
      },
      awayForm: {
        matches: 10,
        weightedPointsPerGame: 2.05,
        strengthAdjustedPointsPerGame: 1.94,
        goalsFor: 2.1,
        goalsAgainst: 0.8,
        cleanSheetRate: 0.44,
        source: "historical",
      },
    };

    render(
      <ContextSection
        analysis={analyzeMatch(dataset)}
        dataset={dataset}
        subsection="Forma reciente"
      />,
    );

    expect(screen.getByText(/8 partidos históricos/i)).toBeVisible();
    expect(screen.getByText(/forma ponderada 1.88/i)).toBeVisible();
    expect(screen.getByText(/ajustada por rival 1.71/i)).toBeVisible();
    expect(screen.getByText(/Elo 1812/i)).toBeVisible();
    expect(screen.getByText(/10 partidos históricos/i)).toBeVisible();
  });
});
