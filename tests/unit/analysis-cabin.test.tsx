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

  it("renderiza contexto, táctica y porteros con equipos genéricos", async () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam = {
      ...dataset.match.homeTeam,
      name: "River Azul",
    };
    dataset.match.awayTeam = {
      ...dataset.match.awayTeam,
      name: "Estrella Norte",
    };

    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(dataset)}
        dataset={dataset}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /02 · contexto/i }),
    );

    expect(screen.getByText(/Necesidad de River Azul/i)).toBeVisible();
    expect(screen.getByText(/Necesidad de Estrella Norte/i)).toBeVisible();
    expect(
      screen.queryByText(/Necesidad de Colombia|Necesidad de Brasil/i),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /03 · táctica/i }),
    );

    expect(
      screen.queryByText(/Brasil busca|Colombia protege/i),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/Estrella Norte/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/River Azul/i).length).toBeGreaterThan(0);

    await userEvent.click(
      screen.getByRole("button", { name: /07 · porteros/i }),
    );

    expect(
      screen.queryByText(/Brasil concentra|Colombia puede/i),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/Estrella Norte/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/River Azul/i).length).toBeGreaterThan(0);
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

  it("abre el desglose detallado del mercado al hacer clic en una fila de la tabla y se cierra con Escape", async () => {
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

    const row = screen.getByRole("button", { name: /Detalle del mercado Más de 2.5 goles/i });
    await userEvent.click(row);

    const drawer = screen.getByRole("dialog", { name: /Más de 2.5 goles/i });
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText(/Modelo Matemático/i)).toBeInTheDocument();
    expect(screen.getByText(/Masa de Probabilidad Dixon-Coles/i)).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /Más de 2.5 goles/i })).not.toBeInTheDocument();
  });
});
