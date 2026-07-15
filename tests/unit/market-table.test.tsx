import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarketTable } from "@/components/analysis/MarketTable";
import type { Prediction } from "@/types/domain";

afterEach(cleanup);

function prediction(overrides: Partial<Prediction>): Prediction {
  return {
    id: "market-1",
    category: "corners",
    market: "Más de 8.5 corners",
    probability: 57.4,
    interval: [51, 63],
    confidence: 6.2,
    riskLevel: "Medio",
    risk: "Sensibilidad alta si cambia el ritmo de bandas.",
    reason: "Volumen de ataques y producción reciente de corners.",
    valueTier: "Moderado",
    evidenceStatus: "expected",
    sourceIds: ["api-team-stats"],
    ...overrides,
  };
}

describe("MarketTable", () => {
  it("muestra el estado de evidencia de cada mercado", () => {
    render(
      <MarketTable
        predictions={[
          prediction({ id: "confirmed", evidenceStatus: "confirmed" }),
          prediction({
            id: "estimated",
            market: "Más de 2.5 goles",
            evidenceStatus: "expected",
          }),
          prediction({
            id: "unavailable",
            market: "Jugador remata a puerta",
            probability: undefined,
            evidenceStatus: "unavailable",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: /evidencia/i })).toBeVisible();
    expect(screen.getByText("Confirmado")).toBeVisible();
    expect(screen.getByText("Estimado")).toBeVisible();
    expect(
      screen.getByTitle("Sin datos suficientes para sostener el mercado."),
    ).toHaveTextContent("No disponible");
  });

  it("explica por qué cada mercado merece más o menos confianza", () => {
    render(
      <MarketTable
        predictions={[
          prediction({
            market: "Más de 2.5 goles",
            probability: 58.2,
            interval: [52, 64],
            minimumOddForValue: 1.82,
            availableOdd: 1.95,
            marketProbability: 53.1,
            modelEdge: 5.1,
            expectedValue: 13.5,
            evidenceStatus: "expected",
            sourceIds: ["poisson", "odds", "lineups"],
          }),
        ]}
      />,
    );

    expect(screen.getByText(/lectura del mercado/i)).toBeVisible();
    expect(screen.getByText(/3 fuentes/i)).toBeVisible();
    expect(screen.getByText(/cuota disponible 1.95/i)).toBeVisible();
    expect(screen.getByText(/ventaja del modelo \+5.1 pp/i)).toBeVisible();
    expect(screen.getByText(/rango 52-64%/i)).toBeVisible();
  });
  it("usa un boton semantico para abrir el detalle del mercado", async () => {
    const user = userEvent.setup();
    const onSelectPrediction = vi.fn();
    const row = prediction({ market: "Brasil gana" });

    render(
      <MarketTable
        predictions={[row]}
        onSelectPrediction={onSelectPrediction}
      />,
    );

    const detailButton = screen.getByRole("button", { name: /Brasil gana/i });
    expect(detailButton.tagName).toBe("BUTTON");

    await user.click(detailButton);

    expect(screen.queryAllByRole("button")).toHaveLength(1);
    expect(onSelectPrediction).toHaveBeenCalledWith(row);
  });
});
