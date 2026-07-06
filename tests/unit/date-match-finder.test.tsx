import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateMatchFinder } from "@/components/home/DateMatchFinder";
import { demoMatches } from "@/data/demo";
import type { NormalizedMatch } from "@/types/domain";

function buildManyMatches(total: number): NormalizedMatch[] {
  return Array.from({ length: total }, (_, index) => {
    const matchNumber = index + 1;
    return {
      ...demoMatches[0],
      id: `bulk-match-${matchNumber}`,
      time: `${String(10 + (index % 10)).padStart(2, "0")}:00`,
      homeTeam: {
        ...demoMatches[0].homeTeam,
        id: `home-${matchNumber}`,
        name: `Equipo Local ${matchNumber}`,
      },
      awayTeam: {
        ...demoMatches[0].awayTeam,
        id: `away-${matchNumber}`,
        name: `Equipo Visitante ${matchNumber}`,
      },
      venue: `Estadio ${matchNumber}`,
    };
  });
}

describe("DateMatchFinder", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("busca y muestra partidos normalizados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mode: "demo",
          source: "Muestra local de respaldo",
          warnings: [],
          matches: demoMatches,
        }),
      }),
    );
    render(<DateMatchFinder initialDate="2026-06-15" />);
    await userEvent.click(
      screen.getByRole("button", { name: /buscar partidos/i }),
    );
    expect(await screen.findByText(/Colombia vs Brasil/i)).toBeVisible();
    expect(screen.getAllByText(/COT/i).length).toBeGreaterThan(0);
  });

  it("limita resultados masivos y permite mostrar más partidos", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mode: "demo",
          source: "Muestra local de respaldo",
          warnings: [],
          matches: buildManyMatches(80),
        }),
      }),
    );

    render(<DateMatchFinder initialDate="2026-06-15" />);
    await user.click(screen.getByRole("button", { name: /buscar partidos/i }));

    expect(await screen.findByText(/80 partidos encontrados/i)).toBeVisible();
    expect(screen.getByText(/mostrando 20/i)).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Equipo Local/i })).toHaveLength(
      20,
    );

    await user.click(screen.getByRole("button", { name: /mostrar 20 más/i }));

    expect(screen.getByText(/mostrando 40/i)).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Equipo Local/i })).toHaveLength(
      40,
    );
  });

  it("explica cómo activar datos reales cuando no hay partidos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mode: "demo",
          source: "Muestra local de respaldo",
          warnings: [
            "Sin cobertura real disponible: se muestra una muestra local claramente identificada.",
          ],
          matches: [],
          providerStatus: [
            {
              id: "football-data",
              label: "Football-Data.org",
              envName: "FOOTBALL_DATA_API_KEY",
              configured: false,
              docsUrl: "https://www.football-data.org/documentation/quickstart",
              purpose: "Calendarios y resultados de ligas europeas.",
            },
          ],
        }),
      }),
    );

    render(<DateMatchFinder initialDate="2026-06-26" />);
    await userEvent.click(
      screen.getByRole("button", { name: /buscar partidos/i }),
    );

    expect(await screen.findByText(/no encontramos partidos/i)).toBeVisible();
    expect(screen.getByText(/no se mezclan competiciones/i)).toBeVisible();
    expect(screen.getByText(/FOOTBALL_DATA_API_KEY/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /ver guía de apis/i }),
    ).toHaveAttribute("href", "/docs/provider-setup");
  });
  it("los presets del estado vacio ejecutan una nueva busqueda util", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: "demo",
          source: "Muestra local de respaldo",
          warnings: [],
          matches: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: "api",
          source: "API-Football",
          warnings: [],
          matches: demoMatches,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<DateMatchFinder initialDate="2026-07-01" />);
    await user.click(screen.getByRole("button", { name: /buscar partidos/i }));
    await user.click(
      await screen.findByRole("button", {
        name: /probar mundial con datos reales/i,
      }),
    );

    expect(await screen.findByText(/Colombia vs Brasil/i)).toBeVisible();
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "competition=wc-2026",
    );
  });

  it("limpia resultados anteriores cuando una nueva busqueda falla", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            mode: "demo",
            source: "Muestra local de respaldo",
            warnings: [],
            matches: demoMatches,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            detail: "Usa el formato YYYY-MM-DD.",
          }),
        }),
    );

    render(<DateMatchFinder initialDate="2026-06-15" />);
    await user.click(screen.getByRole("button", { name: /buscar partidos/i }));
    expect(await screen.findByText(/Colombia vs Brasil/i)).toBeVisible();

    await user.clear(screen.getByLabelText("Fecha"));
    await user.click(screen.getByRole("button", { name: /buscar partidos/i }));

    expect(await screen.findByText(/Usa el formato YYYY-MM-DD/i)).toBeVisible();
    expect(screen.queryByText(/Colombia vs Brasil/i)).not.toBeInTheDocument();
  });
});
