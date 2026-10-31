import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlayersSection } from "@/components/analysis/sections/PlayersSection";
import { demoDataset } from "@/data/demo";

afterEach(cleanup);

describe("PlayersSection", () => {
  it("explica contexto de equipo, titularidad y confiabilidad para cada jugador", () => {
    const dataset = structuredClone(demoDataset);
    dataset.players = [
      {
        id: "home-nine",
        teamId: dataset.match.homeTeam.id,
        name: "Nueve local",
        position: "DC",
        starterStatus: "expected",
        goalProbability: 0.41,
        shots: 3.3,
      },
      {
        id: "away-winger",
        teamId: dataset.match.awayTeam.id,
        name: "Extremo visitante",
        position: "EI",
        starterStatus: "confirmed",
        goalProbability: 0.22,
        shots: 2.1,
      },
    ];

    render(<PlayersSection dataset={dataset} subsection="Goleadores" />);

    const localCard = screen.getByText("Nueve local").closest("article");
    expect(localCard).not.toBeNull();
    expect(within(localCard!).getByText(/Colombia/i)).toBeVisible();
    expect(within(localCard!).getByText(/Titular esperado/i)).toBeVisible();
    expect(within(localCard!).getByText(/41%/i)).toBeVisible();
    expect(
      within(localCard!).getByText(/lectura individual condicionada/i),
    ).toBeVisible();

    const awayCard = screen.getByText("Extremo visitante").closest("article");
    expect(awayCard).not.toBeNull();
    expect(within(awayCard!).getByText(/Brasil/i)).toBeVisible();
    expect(within(awayCard!).getByText(/Titular confirmado/i)).toBeVisible();
  });

  it("explains that missing player names are a snapshot limitation, not proof of absent players", () => {
    const dataset = structuredClone(demoDataset);
    dataset.players = [];
    dataset.sources = [
      ...dataset.sources.filter((source) => source.id !== "api-lineups"),
      {
        id: "api-lineups",
        label: "API-Football · alineaciones",
        type: "provider",
        status: "unavailable",
        observedAt: "2026-10-23T12:00:00.000Z",
        detail: "No fue posible consultar alineaciones oficiales en el proveedor.",
      },
    ];

    render(<PlayersSection dataset={dataset} subsection="Goleadores" />);

    expect(
      screen.getByText(
        /este análisis no contiene nombres de jugadores verificables.*consulta la sección fuentes/i,
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/las fuentes consultadas no incluyen datos de jugadores/i),
    ).not.toBeInTheDocument();
  });
});
