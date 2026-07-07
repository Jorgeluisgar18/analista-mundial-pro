import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalysisCabin } from "@/components/analysis/AnalysisCabin";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { demoDataset } from "@/data/demo";

afterEach(cleanup);
afterEach(() => {
  vi.restoreAllMocks();
});

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
    expect(screen.getByText(/2026-06-15 · 17:00 COT/i)).toBeVisible();
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

  it("explica riesgos de porteros segÃºn el volumen real del rival", async () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.homeTeam.name = "Local Volumen";
    dataset.match.awayTeam.name = "Visitante Bajo";
    dataset.home.shots = 18.2;
    dataset.home.shotsOnTarget = 6.4;
    dataset.away.shots = 6.1;
    dataset.away.shotsOnTarget = 1.9;

    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(dataset)}
        dataset={dataset}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: (name) => name.startsWith("07") && /porteros/i.test(name),
      }),
    );

    expect(
      screen.getByText((text) =>
        text.includes("Local Volumen concentra") &&
        text.includes("remates"),
      ),
    ).toBeVisible();
    expect(
      screen.queryByText((text) =>
        text.includes("Visitante Bajo concentra") &&
        text.includes("remates"),
      ),
    ).not.toBeInTheDocument();
  });

  it("abre cambios manuales como diálogo modal y permite cerrar con Escape", async () => {
    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(demoDataset)}
        dataset={demoDataset}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: (n) => n === "Cambios manuales" }),
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

  it("envia cambios manuales con token de analista desde el panel", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ analysis: analyzeMatch(demoDataset) }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(demoDataset)}
        dataset={demoDataset}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: (name) => name === "Cambios manuales" }),
    );
    await user.type(screen.getByLabelText(/token de analista/i), "token-local");
    await user.type(
      screen.getByLabelText(/descripci/i),
      "Baja confirmada por reporte oficial",
    );
    await user.click(screen.getByRole("button", { name: /guardar y recalcular/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/match/${demoDataset.match.id}/overrides`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-analyst-token": "token-local",
        }),
      }),
    );
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

  it("ofrece una salida clara para volver al buscador de partidos", () => {
    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(demoDataset)}
        dataset={demoDataset}
      />,
    );

    const desktopLink = screen.getByRole("link", { name: /cambiar partido/i });
    const mobileLink = screen.getByRole("link", { name: /volver al buscador de partidos/i });

    expect(desktopLink).toHaveAttribute("href", "/#partidos");
    expect(mobileLink).toHaveAttribute("href", "/#partidos");
  });

  it("actualiza también el dataset visual cuando el refresh devuelve nuevas alineaciones", async () => {
    const user = userEvent.setup();
    const initialDataset = structuredClone(demoDataset);
    const refreshedDataset = structuredClone(demoDataset);
    refreshedDataset.lineups[0].formation.value = "3-4-3";
    refreshedDataset.lineups[0].confirmed = true;
    refreshedDataset.lineups[0].starters = [
      "Arquero nuevo",
      "Central A",
      "Central B",
      "Central C",
      "Carrilero D",
      "Interior E",
      "Interior F",
      "Carrilero G",
      "Extremo H",
      "Nueve I",
      "Extremo J",
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          dataset: refreshedDataset,
          analysis: analyzeMatch(refreshedDataset),
        }),
      }),
    );

    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(initialDataset)}
        dataset={initialDataset}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: (name) => name === "Actualizar datos" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: (name) => name.startsWith("03") && /táctica/i.test(name),
      }),
    );

    expect(await screen.findByText("3-4-3")).toBeVisible();
    expect(screen.getByText("Arquero nuevo")).toBeVisible();
  });

  it("muestra una formación completa en campo con los 11 titulares", async () => {
    const dataset = structuredClone(demoDataset);
    dataset.lineups[0].formation.value = "4-2-3-1";
    dataset.lineups[0].starters = [
      "Portero",
      "LD",
      "DFC 1",
      "DFC 2",
      "LI",
      "Pivote 1",
      "Pivote 2",
      "ED",
      "MCO",
      "EI",
      "DC",
    ];

    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(dataset)}
        dataset={dataset}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: (name) => name.startsWith("03") && /táctica/i.test(name),
      }),
    );

    expect(screen.getAllByLabelText(/campo táctico/i).length).toBeGreaterThan(0);
    for (const player of dataset.lineups[0].starters) {
      expect(screen.getByText(player)).toBeVisible();
    }
  });

  it("distingue una alineación oficial parcial de una esperada", async () => {
    const dataset = structuredClone(demoDataset);
    dataset.lineups[0].status = "official-partial";
    dataset.lineups[0].confirmed = false;
    dataset.lineups[0].formation.status = "confirmed";
    dataset.lineups[0].starters = [
      "Arquero oficial",
      "Lateral oficial",
      "Complemento esperado",
      "DFC esperado 1",
      "DFC esperado 2",
      "LI esperado",
      "MC esperado 1",
      "MC esperado 2",
      "ED esperado",
      "MCO esperado",
      "DC esperado",
    ];

    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(dataset)}
        dataset={dataset}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: (name) => name.startsWith("04") && /plantillas/i.test(name),
      }),
    );

    expect(screen.getByText("Oficial parcial")).toBeVisible();
    expect(screen.getByText("Arquero oficial")).toBeVisible();
  });
});
