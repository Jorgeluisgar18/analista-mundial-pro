import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketTable } from "@/components/analysis/MarketTable";
import type { Prediction } from "@/types/domain";

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
});
