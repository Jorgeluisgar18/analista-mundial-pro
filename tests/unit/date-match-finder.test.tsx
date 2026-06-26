import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateMatchFinder } from "@/components/home/DateMatchFinder";
import { demoMatches } from "@/data/demo";

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
          source: "Datos demostrativos locales",
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
  });

  it("explica cómo activar datos reales cuando no hay partidos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mode: "demo",
          source: "Datos demostrativos locales",
          warnings: [
            "Sin claves activas o cobertura disponible: se muestran datos demostrativos.",
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
    expect(screen.getByText(/modo demo solo cubre/i)).toBeVisible();
    expect(screen.getByText(/FOOTBALL_DATA_API_KEY/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /ver guía de apis/i }),
    ).toHaveAttribute("href", "/docs/provider-setup");
  });
});
