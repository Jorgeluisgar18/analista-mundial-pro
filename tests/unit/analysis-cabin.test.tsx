import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AnalysisCabin } from "@/components/analysis/AnalysisCabin";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { demoDataset } from "@/data/demo";

afterEach(cleanup);

describe("AnalysisCabin", () => {
  it("abre Mercados y selecciona Goles", async () => {
    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(demoDataset)}
        dataset={demoDataset}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /05 · mercados/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /^goles$/i }));
    expect(
      screen.getByRole("heading", { name: /mercado de goles/i }),
    ).toBeVisible();
  });

  it("muestra una surebet calculada con cuotas reales del snapshot", async () => {
    const dataset = structuredClone(demoDataset);
    dataset.odds = [
      {
        bookmaker: "Casa A",
        market: "h2h",
        outcome: dataset.match.homeTeam.name,
        odd: 2.2,
        observedAt: "2026-06-25T18:00:00Z",
      },
      {
        bookmaker: "Casa B",
        market: "h2h",
        outcome: "Empate",
        odd: 3.6,
        observedAt: "2026-06-25T18:00:00Z",
      },
      {
        bookmaker: "Casa C",
        market: "h2h",
        outcome: dataset.match.awayTeam.name,
        odd: 4.5,
        observedAt: "2026-06-25T18:00:00Z",
      },
    ];
    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(dataset)}
        dataset={dataset}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /08 · valor y riesgo/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^surebets$/i }),
    );

    expect(screen.getByText(/margen teórico/i)).toBeVisible();
    expect(screen.getByText(/Casa A/i)).toBeVisible();
    expect(screen.getByText(/Casa B/i)).toBeVisible();
    expect(screen.getByText(/Casa C/i)).toBeVisible();
  });

  it("abre cambios manuales como diálogo modal y permite cerrar con Escape", async () => {
    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(demoDataset)}
        dataset={demoDataset}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Cambios manuales/i }),
    );
    const dialog = screen.getByRole("dialog", {
      name: /Cambios manuales/i,
    });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await userEvent.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: /Cambios manuales/i }),
    ).not.toBeInTheDocument();
  });
});
