import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourcesSection } from "@/components/analysis/sections/SourcesSection";
import { demoDataset } from "@/data/demo";
import type { AnalysisResult } from "@/types/domain";

function analysisFixture(): AnalysisResult {
  return {
    id: "analysis-demo",
    modelVersion: "AMP ensemble 1.1.0 · backtest-1.1.0-historical-817",
    generatedAt: "2026-07-14T12:00:00.000Z",
    manuallyUpdated: false,
    match: {} as AnalysisResult["match"],
    executiveSummary: "Resumen",
    mainProbabilities: { home: 40, draw: 30, away: 30 },
    expected: {
      goals: 2.6,
      homeGoals: 1.4,
      awayGoals: 1.2,
      corners: 9,
      cards: 4,
      confidence: 7,
    },
    predictions: [],
    arbitrage: [],
    scenarios: [],
    alerts: [],
    sources: [],
    dataQuality: {
      coverage: 88,
      freshness: 91,
      agreement: 84,
      modelStability: 73,
      lineupConfirmed: false,
      note: "Datos mixtos con calibración histórica.",
    },
    calibration: {
      sampleSize: 817,
      brier: 0.62,
      logLoss: 1.04,
      rps: 0.21,
      dixonColesRho: -0.08,
      rhoSampleSize: 817,
      rhoAverageLogLoss: 1.02,
      applied: true,
      confidenceMultiplier: 0.86,
      note: "Calibración aplicada sobre histórico.",
    },
  };
}

describe("SourcesSection", () => {
  it("explica version y componentes del modelo en calidad de fuentes", () => {
    render(
      <SourcesSection
        analysis={analysisFixture()}
        dataset={structuredClone(demoDataset)}
        subsection="Calidad"
      />,
    );

    expect(screen.getByText(/versión del modelo/i)).toBeVisible();
    expect(
      screen.getByText(/AMP ensemble 1.1.0 · backtest-1.1.0-historical-817/i),
    ).toBeVisible();
    expect(screen.getByText(/Poisson \+ Dixon-Coles/i)).toBeVisible();
    expect(screen.getByText(/Monte Carlo/i)).toBeVisible();
    expect(screen.getByText(/Regresión logística/i)).toBeVisible();
  });

  it("separa las señales del 1X2 de cuotas, alineaciones y datos ausentes", () => {
    const dataset = structuredClone(demoDataset);
    dataset.odds = [];
    dataset.historical = undefined;
    dataset.sources = [
      {
        id: "footballdata-io-stats",
        label: "Footballdata.io · estadísticas",
        type: "provider",
        status: "unavailable",
        observedAt: "2026-10-26T12:00:00.000Z",
        detail: "Sin métricas de temporada para esta competición.",
      },
      {
        id: "footballdata-io-availability",
        label: "Footballdata.io · disponibilidad",
        type: "provider",
        status: "unavailable",
        observedAt: "2026-10-26T12:00:00.000Z",
        detail: "No aporta lesiones o sanciones en este flujo.",
      },
    ];

    render(
      <SourcesSection
        analysis={analysisFixture()}
        dataset={dataset}
        subsection="Calidad"
      />,
    );

    expect(
      screen.getAllByText(/cuotas y alineaciones no alimentan las probabilidades principales/i),
    ).toHaveLength(2);
    expect(screen.getByText(/sin cuotas disponibles/i)).toBeVisible();
    expect(screen.getAllByText(/alineaciones se presentan como contexto/i)).toHaveLength(2);
    expect(screen.getAllByText(/aplicada con 817 partidos/i)).toHaveLength(2);
    expect(screen.getByText(/no aporta lesiones o sanciones/i)).toBeVisible();
    expect(
      screen.getAllByText(/estadísticas del proveedor no confirmadas/i),
    ).toHaveLength(2);
    expect(screen.getAllByText(/no son observaciones verificadas/i)).toHaveLength(2);
  });

});
